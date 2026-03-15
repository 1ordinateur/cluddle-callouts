var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/constants.js
var require_constants = __commonJS({
  "src/constants.js"(exports2, module2) {
    var BUILTIN_CALLOUTS = [
      "note",
      "abstract",
      "info",
      "todo",
      "tip",
      "important",
      "success",
      "question",
      "warning",
      "failure",
      "danger",
      "bug",
      "example",
      "quote",
      "cite"
    ];
    var DEFAULT_SETTINGS2 = {
      maxRowsPerColumn: 8,
      preferCustomInSearch: true
    };
    var GROUP_PROPERTY_PREFIX = "callout-group-";
    module2.exports = {
      BUILTIN_CALLOUTS,
      DEFAULT_SETTINGS: DEFAULT_SETTINGS2,
      GROUP_PROPERTY_PREFIX
    };
  }
});

// src/callout-registry.js
var require_callout_registry = __commonJS({
  "src/callout-registry.js"(exports2, module2) {
    var { BUILTIN_CALLOUTS, GROUP_PROPERTY_PREFIX } = require_constants();
    var CalloutRegistry2 = class {
      constructor(app) {
        this.app = app;
        this.customCallouts = [];
        this.aliasToPrimary = /* @__PURE__ */ new Map();
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
        const aliasToPrimary = /* @__PURE__ */ new Map();
        const seenPrimaryIds = /* @__PURE__ */ new Set();
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
        const seen = /* @__PURE__ */ new Set();
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
            groupAliases: [id, ...customCallout ? customCallout.aliases : []],
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
        const activeAliases = Array.isArray(option.groupAliases) && option.groupAliases.length > 0 ? [option.id, ...option.groupAliases] : [option.id, ...option.aliases || []];
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
        const properties = /* @__PURE__ */ new Map();
        const propertyRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gim;
        let match;
        while ((match = propertyRegex.exec(body)) !== null) {
          properties.set(match[1].toLowerCase(), this.parseMetadataValue(match[2]));
        }
        const concept = properties.get("callout-concept") || "";
        const configuredGroups = this.parseMetadataList(properties.get("callout-groups") || "");
        const inferredGroups = Array.from(properties.keys()).filter((key) => key.startsWith(GROUP_PROPERTY_PREFIX)).map((key) => key.slice(GROUP_PROPERTY_PREFIX.length)).filter((groupName) => groupName.length > 0);
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
        return String(value || "").trim().replace(/^['"]|['"]$/g, "");
      }
      parseMetadataList(value) {
        return String(value || "").split(/[\s,]+/).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
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
    };
    module2.exports = {
      CalloutRegistry: CalloutRegistry2
    };
  }
});

// src/editor-callout-service.js
var require_editor_callout_service = __commonJS({
  "src/editor-callout-service.js"(exports2, module2) {
    var EditorCalloutService2 = class {
      findCalloutContext(editor) {
        const cursorLine = editor.getCursor("head").line;
        if (!this.isBlockquoteLine(editor.getLine(cursorLine))) {
          return null;
        }
        let headerContext = null;
        for (let lineNumber = cursorLine; lineNumber >= 0; lineNumber -= 1) {
          const line = editor.getLine(lineNumber);
          const parsedHeader = this.parseCalloutHeaderLine(line);
          if (parsedHeader) {
            headerContext = {
              ...parsedHeader,
              headerLine: line,
              lineStart: lineNumber
            };
            break;
          }
          if (!this.isBlockquoteLine(line)) {
            return null;
          }
        }
        if (!headerContext) {
          return null;
        }
        let lineEnd = headerContext.lineStart;
        for (let lineNumber = headerContext.lineStart + 1; lineNumber < editor.lineCount(); lineNumber += 1) {
          if (!this.isBlockquoteLine(editor.getLine(lineNumber))) {
            break;
          }
          lineEnd = lineNumber;
        }
        return {
          ...headerContext,
          lineEnd
        };
      }
      applyCalloutChoice(editor, calloutId, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (context) {
          editor.setLine(context.lineStart, this.replaceCalloutType(context.headerLine, calloutId));
          return;
        }
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
          editor.replaceSelection(this.wrapSelectionAsCallout(selection, calloutId));
          return;
        }
        const cursor = editor.getCursor();
        const insertion = `> [!${calloutId}]
> `;
        editor.replaceRange(insertion, cursor);
        editor.setCursor({ line: cursor.line + 1, ch: 2 });
      }
      clearCalloutFromEditor(editor, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (!context) {
          return;
        }
        editor.setLine(context.lineStart, this.removeCalloutHeader(context.headerLine));
      }
      isCalloutHeaderLine(line) {
        return this.parseCalloutHeaderLine(line) !== null;
      }
      isBlockquoteLine(line) {
        return /^\s*>/.test(line || "");
      }
      parseCalloutHeaderLine(line) {
        const match = /^(\s*>\s*)\[!([^\]|+-]+)(?:[^\]]*)\]([+-]?)(.*)$/.exec(line || "");
        if (!match) {
          return null;
        }
        return {
          prefix: match[1],
          calloutType: match[2],
          foldState: match[3] || "",
          remainder: match[4] || ""
        };
      }
      replaceCalloutType(line, calloutId) {
        const parsedHeader = this.parseCalloutHeaderLine(line);
        if (!parsedHeader) {
          return line;
        }
        return `${parsedHeader.prefix}[!${calloutId}]${parsedHeader.foldState}${parsedHeader.remainder}`;
      }
      removeCalloutHeader(line) {
        const parsedHeader = this.parseCalloutHeaderLine(line);
        if (!parsedHeader) {
          return line;
        }
        const trimmedPrefix = parsedHeader.prefix.replace(/\s+$/, "");
        const trimmedRemainder = parsedHeader.remainder.trimStart();
        if (!trimmedRemainder) {
          return trimmedPrefix.length > 0 ? trimmedPrefix : ">";
        }
        return `${trimmedPrefix} ${trimmedRemainder}`;
      }
      getActiveCalloutTypeFromEditor(editor) {
        return this.findCalloutContext(editor)?.calloutType || "";
      }
      wrapSelectionAsCallout(selection, calloutId) {
        const normalized = String(selection || "").replace(/\r\n/g, "\n");
        const lines = normalized.split("\n");
        const content = lines.map((line) => {
          if (line.length === 0) {
            return ">";
          }
          return `> ${line}`;
        }).join("\n");
        return `> [!${calloutId}]
${content}`;
      }
    };
    module2.exports = {
      EditorCalloutService: EditorCalloutService2
    };
  }
});

// src/grouped-section-container.js
var require_grouped_section_container = __commonJS({
  "src/grouped-section-container.js"(exports2, module2) {
    var GroupedSectionContainer = class {
      constructor(contentEl, createWrapper, createSection) {
        this.contentEl = contentEl;
        this.createWrapper = createWrapper;
        this.createSection = createSection;
        this.entries = /* @__PURE__ */ new Map();
      }
      getSectionEntry(sectionKey, label) {
        if (this.entries.has(sectionKey)) {
          return this.entries.get(sectionKey);
        }
        const wrapper = this.createWrapper(this.contentEl, sectionKey, label);
        const section = this.createSection(wrapper, sectionKey);
        const entry = { wrapper, section };
        this.entries.set(sectionKey, entry);
        return entry;
      }
      toggleEmptySections(querySelector, hiddenClassName) {
        for (const entry of this.entries.values()) {
          const visibleItems = Array.from(entry.section.querySelectorAll(querySelector)).filter((itemNode) => !itemNode.classList.contains(hiddenClassName) && !itemNode.hasClass?.(hiddenClassName));
          entry.wrapper.classList?.toggle("is-empty", visibleItems.length === 0);
          entry.wrapper.toggleClass?.("is-empty", visibleItems.length === 0);
        }
      }
      values() {
        return this.entries.values();
      }
    };
    module2.exports = {
      GroupedSectionContainer
    };
  }
});

// src/callout-picker-modal.js
var require_callout_picker_modal = __commonJS({
  "src/callout-picker-modal.js"(exports2, module2) {
    var { Modal, setIcon } = require("obsidian");
    var { GroupedSectionContainer } = require_grouped_section_container();
    var CalloutPickerModal = class extends Modal {
      constructor(app, options) {
        super(app);
        this.controller = options.controller;
        this.options = options.options;
        this.activeType = options.activeType || "";
        this.onChoose = options.onChoose;
        this.onClear = options.onClear;
      }
      onOpen() {
        this.modalEl.addClass("custom-callout-picker-modal");
        this.contentEl.empty();
        const shell = this.contentEl.createDiv({ cls: "custom-callout-context-menu-shell custom-callout-picker-shell" });
        const searchWrap = shell.createDiv({ cls: "custom-callout-context-menu-search" });
        const searchInput = searchWrap.createEl("input", {
          cls: "custom-callout-context-menu-search-input",
          attr: {
            type: "text",
            placeholder: "Search callouts"
          }
        });
        const content = shell.createDiv({ cls: "custom-callout-context-menu-content" });
        const sections = new GroupedSectionContainer(
          content,
          (parent, sectionKey, label) => {
            const wrapper = parent.createDiv({ cls: "custom-callout-context-menu-group", attr: { "data-section": sectionKey } });
            wrapper.createDiv({ cls: "custom-callout-context-menu-group-label", text: this.controller.formatTitle(label || sectionKey) });
            return wrapper;
          },
          (wrapper, sectionKey) => wrapper.createDiv({ cls: "custom-callout-context-menu-section", attr: { "data-section": sectionKey } })
        );
        this.modalEl.style.setProperty("--custom-callout-max-rows", String(this.controller.getMaxRowsPerColumn()));
        let itemIndex = 0;
        for (const option of this.options) {
          const itemNode = this.createItemNode(option, itemIndex);
          itemIndex += 1;
          if (option.isCustom) {
            sections.getSectionEntry(option.group || "custom", option.group || "custom").section.appendChild(itemNode);
          } else {
            sections.getSectionEntry("builtin", "builtin").section.appendChild(itemNode);
          }
        }
        sections.getSectionEntry("utility", "utility").section.appendChild(this.createUtilityNode(itemIndex));
        const applyFilter = () => {
          const query = searchInput.value.trim().toLowerCase();
          const menuItems = Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"));
          let bestMatch = null;
          for (const itemNode of menuItems) {
            itemNode.removeClass("is-search-top-result");
            const score = this.controller.getMenuItemSearchScore(itemNode, query);
            const isVisible = score > 0;
            itemNode.toggleClass("is-search-hidden", !isVisible);
            itemNode.style.order = query.length === 0 ? itemNode.getAttribute("data-default-order") || "0" : String(1e5 - score);
            if (!isVisible) {
              continue;
            }
            if (bestMatch === null || score > bestMatch.score || score === bestMatch.score && this.controller.compareMenuItems(itemNode, bestMatch.itemNode) < 0) {
              bestMatch = { itemNode, score };
            }
          }
          sections.toggleEmptySections(".custom-callout-context-menu-item", "is-search-hidden");
          if (bestMatch) {
            bestMatch.itemNode.addClass("is-search-top-result");
          }
        };
        searchInput.addEventListener("input", applyFilter);
        searchInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            const bestMatch = this.contentEl.querySelector(".custom-callout-context-menu-item.is-search-top-result");
            if (bestMatch) {
              event.preventDefault();
              bestMatch.click();
            }
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            this.close();
          }
        });
        window.setTimeout(() => {
          searchInput.focus();
          searchInput.select();
        }, 0);
        applyFilter();
      }
      createItemNode(option, defaultOrder) {
        const itemNode = this.contentEl.createDiv({ cls: "menu-item custom-callout-context-menu-item" });
        itemNode.setAttribute("data-callout-id", option.id);
        itemNode.setAttribute("data-callout-custom", String(option.isCustom));
        itemNode.setAttribute("data-callout-group", option.group || "");
        itemNode.setAttribute("data-callout-concept", option.concept || "");
        itemNode.setAttribute("data-callout-search", this.controller.buildSearchText(option));
        itemNode.setAttribute("data-default-order", String(defaultOrder));
        itemNode.style.setProperty("--custom-callout-context-color", option.color);
        const iconEl = itemNode.createDiv({ cls: "menu-item-icon" });
        if (option.icon) {
          setIcon(iconEl, option.icon);
        }
        itemNode.createDiv({
          cls: "menu-item-title",
          text: this.controller.formatTitle(option.id)
        });
        if (this.controller.isOptionActive(option, this.activeType)) {
          const checkEl = itemNode.createDiv({ cls: "menu-item-icon menu-item-icon-end" });
          setIcon(checkEl, "check");
        }
        itemNode.addEventListener("click", () => {
          this.onChoose(option);
          this.close();
        });
        return itemNode;
      }
      createUtilityNode(defaultOrder) {
        const itemNode = this.contentEl.createDiv({ cls: "menu-item custom-callout-context-menu-item" });
        itemNode.setAttribute("data-callout-id", "none");
        itemNode.setAttribute("data-callout-custom", "false");
        itemNode.setAttribute("data-callout-search", "none clear remove");
        itemNode.setAttribute("data-default-order", String(defaultOrder));
        itemNode.style.setProperty("--custom-callout-context-color", "128, 128, 128");
        const iconEl = itemNode.createDiv({ cls: "menu-item-icon" });
        setIcon(iconEl, "eraser");
        itemNode.createDiv({ cls: "menu-item-title", text: "None" });
        itemNode.addEventListener("click", () => {
          this.onClear();
          this.close();
        });
        return itemNode;
      }
    };
    module2.exports = {
      CalloutPickerModal
    };
  }
});

// src/search-utils.js
var require_search_utils = __commonJS({
  "src/search-utils.js"(exports2, module2) {
    function normalizeSearchText(value) {
      return String(value || "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    }
    function getFuzzyScore(query, candidate) {
      const normalizedQuery = normalizeSearchText(query);
      const normalizedCandidate = normalizeSearchText(candidate);
      if (!normalizedQuery || !normalizedCandidate) {
        return 0;
      }
      if (normalizedCandidate === normalizedQuery) {
        return 1e3 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
      }
      if (normalizedCandidate.startsWith(normalizedQuery)) {
        return 800 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
      }
      const containsIndex = normalizedCandidate.indexOf(normalizedQuery);
      if (containsIndex >= 0) {
        return 650 - containsIndex * 4 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
      }
      let score = 0;
      let queryIndex = 0;
      let consecutive = 0;
      let firstMatchIndex = -1;
      let lastMatchIndex = -1;
      for (let candidateIndex = 0; candidateIndex < normalizedCandidate.length; candidateIndex += 1) {
        if (normalizedCandidate[candidateIndex] !== normalizedQuery[queryIndex]) {
          consecutive = 0;
          continue;
        }
        if (firstMatchIndex === -1) {
          firstMatchIndex = candidateIndex;
        }
        const isWordBoundary = candidateIndex === 0 || normalizedCandidate[candidateIndex - 1] === " ";
        score += isWordBoundary ? 35 : 18;
        consecutive += 1;
        score += consecutive * 12;
        lastMatchIndex = candidateIndex;
        queryIndex += 1;
        if (queryIndex === normalizedQuery.length) {
          break;
        }
      }
      if (queryIndex !== normalizedQuery.length) {
        return 0;
      }
      const spreadPenalty = Math.max(0, lastMatchIndex - firstMatchIndex - normalizedQuery.length);
      const startPenalty = Math.max(0, firstMatchIndex);
      return 300 + score - spreadPenalty * 3 - startPenalty * 2;
    }
    function getBestFuzzyScore(query, candidates) {
      let bestScore = 0;
      for (const candidate of candidates) {
        const score = getFuzzyScore(query, candidate);
        if (score > bestScore) {
          bestScore = score;
        }
      }
      return bestScore;
    }
    module2.exports = {
      normalizeSearchText,
      getFuzzyScore,
      getBestFuzzyScore
    };
  }
});

// src/callout-menu-controller.js
var require_callout_menu_controller = __commonJS({
  "src/callout-menu-controller.js"(exports2, module2) {
    var { CalloutPickerModal } = require_callout_picker_modal();
    var { normalizeSearchText, getBestFuzzyScore } = require_search_utils();
    var CalloutMenuController2 = class {
      constructor(options) {
        this.app = options.app;
        this.registry = options.registry;
        this.editorService = options.editorService;
        this.getMaxRowsPerColumn = options.getMaxRowsPerColumn;
        this.preferCustomInSearch = options.preferCustomInSearch;
      }
      unload() {
      }
      addEditorMenuItems(menu, editor) {
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
          return;
        }
        const context = this.editorService.findCalloutContext(editor);
        const title = context ? "Change callout type" : editor.getSelection().length > 0 ? "Wrap selection in callout" : "Insert callout";
        menu.addItem((item) => {
          item.setTitle(title).setIcon("panel-top-open").setSection("callouts").onClick(() => {
            this.openCalloutPicker(editor, context);
          });
        });
        if (!context) {
          return;
        }
        menu.addItem((item) => {
          item.setTitle("Remove callout").setIcon("eraser").setSection("callouts").onClick(() => {
            this.editorService.clearCalloutFromEditor(editor, context);
          });
        });
      }
      openCalloutPicker(editor, existingContext = null) {
        const activeType = existingContext?.calloutType || this.editorService.getActiveCalloutTypeFromEditor(editor);
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
          return;
        }
        const modal = new CalloutPickerModal(this.app, {
          controller: this,
          options,
          activeType,
          onChoose: (option) => {
            this.editorService.applyCalloutChoice(editor, option.id, existingContext);
          },
          onClear: () => {
            this.editorService.clearCalloutFromEditor(editor, existingContext);
          }
        });
        modal.open();
      }
      formatTitle(id) {
        const normalized = String(id || "").replace(/[-_]+/g, " ");
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      }
      isOptionActive(option, activeType) {
        return this.registry.isOptionActive(option, activeType);
      }
      buildSearchText(option) {
        return [
          option.id,
          option.concept || "",
          option.group || "",
          ...option.groupAliases || [],
          ...option.aliases || []
        ].join(" ").toLowerCase();
      }
      getMenuItemSearchScore(itemNode, query) {
        if (!itemNode) {
          return 0;
        }
        const normalizedQuery = normalizeSearchText(query);
        let score = 1;
        if (normalizedQuery.length > 0) {
          const candidates = [
            itemNode.getAttribute("data-callout-id") || "",
            itemNode.getAttribute("data-callout-search") || "",
            itemNode.querySelector(".menu-item-title")?.textContent || ""
          ];
          score = getBestFuzzyScore(normalizedQuery, candidates);
        }
        if (score > 0 && this.preferCustomInSearch() && itemNode.getAttribute("data-callout-custom") === "true") {
          score += 75;
        }
        return score;
      }
      compareMenuItems(a, b) {
        if (this.preferCustomInSearch()) {
          const aIsCustom = a.getAttribute("data-callout-custom") === "true";
          const bIsCustom = b.getAttribute("data-callout-custom") === "true";
          if (aIsCustom !== bIsCustom) {
            return aIsCustom ? -1 : 1;
          }
        }
        const aOrder = Number(a.getAttribute("data-default-order") || "0");
        const bOrder = Number(b.getAttribute("data-default-order") || "0");
        return aOrder - bOrder;
      }
    };
    module2.exports = {
      CalloutMenuController: CalloutMenuController2
    };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    var { PluginSettingTab, Setting } = require("obsidian");
    var { DEFAULT_SETTINGS: DEFAULT_SETTINGS2 } = require_constants();
    var CustomCalloutContextMenuSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      display() {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl).setName("Max rows per column").setDesc("Controls how many callout options appear before the picker starts a new column.").addText((text) => {
          text.setPlaceholder(String(DEFAULT_SETTINGS2.maxRowsPerColumn)).setValue(String(this.plugin.getMaxRowsPerColumn())).onChange(async (value) => {
            const parsed = Number(value);
            this.plugin.settings.maxRowsPerColumn = Number.isFinite(parsed) ? Math.min(24, Math.max(1, Math.round(parsed))) : DEFAULT_SETTINGS2.maxRowsPerColumn;
            await this.plugin.savePluginSettings();
          });
        });
        new Setting(containerEl).setName("Prefer custom callouts in search").setDesc("Biases fuzzy search toward your CSS-defined custom callouts before built-in Obsidian ones.").addToggle((toggle) => {
          toggle.setValue(this.plugin.preferCustomInSearch()).onChange(async (value) => {
            this.plugin.settings.preferCustomInSearch = value;
            await this.plugin.savePluginSettings();
          });
        });
      }
    };
    module2.exports = {
      CustomCalloutContextMenuSettingTab: CustomCalloutContextMenuSettingTab2
    };
  }
});

// src/main.js
var { Plugin } = require("obsidian");
var { DEFAULT_SETTINGS } = require_constants();
var { CalloutRegistry } = require_callout_registry();
var { EditorCalloutService } = require_editor_callout_service();
var { CalloutMenuController } = require_callout_menu_controller();
var { CustomCalloutContextMenuSettingTab } = require_settings_tab();
module.exports = class CustomCalloutContextMenuPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.registry = new CalloutRegistry(this.app);
    this.editorService = new EditorCalloutService();
    this.menuController = new CalloutMenuController({
      app: this.app,
      registry: this.registry,
      editorService: this.editorService,
      getMaxRowsPerColumn: () => this.getMaxRowsPerColumn(),
      preferCustomInSearch: () => this.preferCustomInSearch()
    });
    await this.registry.refresh();
    this.registerEvent(this.app.workspace.on("css-change", () => {
      this.registry.refresh();
    }));
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
      this.menuController.addEditorMenuItems(menu, editor);
    }));
    this.addCommand({
      id: "open-callout-picker",
      name: "Open callout picker",
      editorCallback: (editor) => {
        this.menuController.openCalloutPicker(editor);
      }
    });
    this.addSettingTab(new CustomCalloutContextMenuSettingTab(this.app, this));
  }
  onunload() {
    this.menuController?.unload();
    this.registry?.unload();
  }
  async savePluginSettings() {
    await this.saveData(this.settings);
  }
  getMaxRowsPerColumn() {
    const value = Number(this.settings.maxRowsPerColumn);
    if (!Number.isFinite(value)) {
      return DEFAULT_SETTINGS.maxRowsPerColumn;
    }
    return Math.min(24, Math.max(1, Math.round(value)));
  }
  preferCustomInSearch() {
    return this.settings.preferCustomInSearch !== false;
  }
};
