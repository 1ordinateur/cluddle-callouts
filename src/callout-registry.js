const { BUILTIN_CALLOUTS, GROUP_PROPERTY_PREFIX } = require("./constants");

class CalloutRegistry {
    constructor(app) {
        this.app = app;
        this.customCallouts = [];
        this.aliasToPrimary = new Map();
        this.previewEl = null;
    }

    async refresh() {
        const configDir = this.app.vault.configDir;
        const appearancePath = `${configDir}/appearance.json`;
        let enabledSnippets = [];

        try {
            const appearanceRaw = await this.app.vault.adapter.read(appearancePath);
            const appearance = JSON.parse(appearanceRaw);
            enabledSnippets = appearance.enabledCssSnippets || [];
        } catch (error) {
            console.error("custom-callout-context-menu: failed to read appearance.json", error);
        }

        const customCallouts = [];
        const aliasToPrimary = new Map();
        const seenPrimaryIds = new Set();

        for (const snippetId of enabledSnippets) {
            const snippetPath = `${configDir}/snippets/${snippetId}.css`;
            let css = null;

            try {
                css = await this.app.vault.adapter.read(snippetPath);
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
        const appearance = this.getCalloutAppearance(id);
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
                color: appearance.color,
                icon: appearance.icon
            }];
        }

        return customCallout.groups.map((group) => {
            const insertId = group.aliases[0] || id;
            return {
                key: `custom:${id}:${group.name}`,
                id: insertId,
                group: group.name,
                isCustom: true,
                aliases: [customCallout.id, ...customCallout.aliases],
                groupAliases: group.aliases,
                concept: customCallout.concept,
                color: appearance.color,
                icon: appearance.icon
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

    unload() {
        if (this.previewEl) {
            this.previewEl.remove();
            this.previewEl = null;
        }
    }

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

    getCalloutAppearance(id) {
        const previewEl = this.getPreviewEl();
        previewEl.setAttribute("data-callout", id);

        const styles = window.getComputedStyle(previewEl);
        const color = styles.getPropertyValue("--callout-color").trim() || "128, 128, 128";
        const rawIcon = styles.getPropertyValue("--callout-icon").trim();
        const icon = rawIcon.startsWith("lucide-") ? rawIcon.slice("lucide-".length) : rawIcon;

        return { color, icon };
    }

    getPreviewEl() {
        if (this.previewEl) {
            return this.previewEl;
        }

        const previewEl = document.body.createDiv({
            cls: "callout custom-callout-context-menu-preview"
        });
        previewEl.style.display = "none";
        this.previewEl = previewEl;
        return previewEl;
    }
}

module.exports = {
    CalloutRegistry
};
