const { BUILTIN_CALLOUTS, GROUP_PROPERTY_PREFIX } = require("./constants");

let normalizeConfigPath = (value) => String(value || "").replace(/\\/g, "/");
try {
    ({ normalizePath: normalizeConfigPath } = require("obsidian"));
} catch (error) {
    // Node-based tests don't load Obsidian's runtime package.
}

class CalloutRegistry {
    constructor(app) {
        this.app = app;
        this.customCallouts = [];
        this.aliasToPrimary = new Map();
    }

    async refresh() {
        let enabledSnippets = [];

        try {
            const appearanceRaw = await this.readConfigFile("appearance.json");
            const appearance = JSON.parse(appearanceRaw);
            enabledSnippets = appearance.enabledCssSnippets || [];
        } catch (error) {
            enabledSnippets = [];
        }

        const customCallouts = [];
        const aliasToPrimary = new Map();
        const seenPrimaryIds = new Set();

        for (const snippetId of enabledSnippets) {
            let css = null;

            try {
                css = await this.readConfigFile(`snippets/${snippetId}.css`);
            } catch (error) {
                continue;
            }

            for (const block of this.parseCalloutBlocks(css, snippetId)) {
                const primaryId = block.ids[0];
                if (!primaryId) {
                    continue;
                }

                for (const alias of block.ids) {
                    aliasToPrimary.set(alias, primaryId);
                }

                if (seenPrimaryIds.has(primaryId) || BUILTIN_CALLOUTS.includes(primaryId)) {
                    continue;
                }

                seenPrimaryIds.add(primaryId);
                customCallouts.push({
                    id: primaryId,
                    aliases: block.ids.slice(1),
                    concept: block.concept || primaryId,
                    groups: block.groups || [],
                    snippetId
                });
            }
        }

        this.customCallouts = customCallouts;
        this.aliasToPrimary = aliasToPrimary;
    }

    async readConfigFile(relativePath) {
        const configPath = normalizeConfigPath(`${this.app.vault.configDir}/${relativePath}`);

        // Hidden config-dir files such as appearance.json and CSS snippets aren't exposed as Vault files.
        // The feature depends on reading those files directly, so the adapter access is intentionally
        // isolated to this helper instead of spreading adapter reads throughout the plugin.
        return this.app.vault.adapter.read(configPath);
    }

    getMenuOptions() {
        const options = [];
        const seen = new Set();

        for (const customCallout of this.customCallouts) {
            const customOptions = this.buildMenuOptions(customCallout.id, true);
            for (const option of customOptions) {
                if (!option || seen.has(option.key)) {
                    continue;
                }
                seen.add(option.key);
                options.push(option);
            }
        }

        for (const builtinId of BUILTIN_CALLOUTS) {
            const option = this.buildMenuOptions(builtinId, false)[0];
            if (!option || seen.has(option.key)) {
                continue;
            }
            seen.add(option.key);
            options.push(option);
        }

        return options;
    }

    buildMenuOptions(id, isCustom) {
        const customCallout = isCustom ? this.customCallouts.find((callout) => callout.id === id) : null;

        if (!customCallout || !Array.isArray(customCallout.groups) || customCallout.groups.length === 0) {
            return [{
                key: isCustom ? `custom:${id}` : `builtin:${id}`,
                id,
                group: isCustom ? "custom" : "builtin",
                isCustom,
                aliases: customCallout ? [customCallout.id, ...customCallout.aliases] : [],
                groupAliases: [id, ...(customCallout ? customCallout.aliases : [])],
                concept: customCallout ? customCallout.concept : id,
                appearanceId: id
            }];
        }

        return customCallout.groups.map((group) => {
            const insertId = group.aliases[0] || id;
            return {
                key: `custom:${id}:${group.name}`,
                id: insertId,
                appearanceId: id,
                group: group.name,
                isCustom: true,
                aliases: [customCallout.id, ...customCallout.aliases],
                groupAliases: group.aliases,
                concept: customCallout.concept
            };
        });
    }

    isOptionActive(option, activeType) {
        if (!option || !activeType) {
            return false;
        }

        const activeAliases = Array.isArray(option.groupAliases) && option.groupAliases.length > 0
            ? [option.id, ...option.groupAliases]
            : [option.id, ...(option.aliases || [])];
        return activeAliases.includes(activeType);
    }

    unload() {}

    parseCalloutBlocks(css, snippetId) {
        const blocks = [];
        const blockRegex = /((?:\s*\.callout\[data-callout="[^"]+"\]\s*,?\s*\n?)+)\s*\{([\s\S]*?)\}/gm;

        let match;
        while ((match = blockRegex.exec(css)) !== null) {
            const selectors = Array.from(match[1].matchAll(/data-callout="([^"]+)"/g)).map((selectorMatch) => selectorMatch[1]);
            if (selectors.length === 0) {
                continue;
            }

            const metadata = this.parseCalloutMetadata(match[2]);
            blocks.push({
                ids: selectors,
                concept: metadata.concept,
                groups: metadata.groups,
                snippetId
            });
        }

        return blocks;
    }

    parseCalloutMetadata(body) {
        const properties = new Map();
        const propertyRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gim;
        let match;

        while ((match = propertyRegex.exec(body)) !== null) {
            properties.set(match[1].toLowerCase(), this.parseMetadataValue(match[2]));
        }

        const concept = properties.get("callout-concept") || "";
        const configuredGroups = this.parseMetadataList(properties.get("callout-groups") || "");
        const inferredGroups = Array.from(properties.keys())
            .filter((key) => key.startsWith(GROUP_PROPERTY_PREFIX))
            .map((key) => key.slice(GROUP_PROPERTY_PREFIX.length))
            .filter((groupName) => groupName.length > 0);

        const groupNames = [];
        for (const groupName of [...configuredGroups, ...inferredGroups]) {
            if (!groupName || groupNames.includes(groupName)) {
                continue;
            }
            groupNames.push(groupName);
        }

        const groups = groupNames.map((groupName) => ({
            name: groupName,
            aliases: this.parseMetadataList(properties.get(`${GROUP_PROPERTY_PREFIX}${groupName}`) || "")
        })).filter((group) => group.aliases.length > 0);

        return { concept, groups };
    }

    parseMetadataValue(value) {
        return String(value || "")
            .trim()
            .replace(/^['"]|['"]$/g, "");
    }

    parseMetadataList(value) {
        return String(value || "")
            .split(/[\s,]+/)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }

}

module.exports = {
    CalloutRegistry
};
