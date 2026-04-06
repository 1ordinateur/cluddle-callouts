const { CalloutPickerModal } = require("./callout-picker-modal");
const { resolvePlaceCursorOnNextLine } = require("./insertion-mode");
const { normalizeSearchText, getBestFuzzyScore } = require("./search-utils");

class CalloutMenuController {
    constructor(options) {
        this.app = options.app;
        this.registry = options.registry;
        this.editorService = options.editorService;
        this.preferCustomInSearch = options.preferCustomInSearch;
        this.placeCursorOnNextLineAfterInsert = options.placeCursorOnNextLineAfterInsert;
    }

    unload() {}

    addEditorMenuItems(menu, editor) {
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        const context = this.editorService.findCalloutContext(editor);
        const title = context
            ? "Change callout type"
            : editor.getSelection().length > 0
                ? "Wrap selection in callout"
                : "Insert callout";

        menu.addItem((item) => {
            item
                .setTitle(title)
                .setIcon("panel-top-open")
                .setSection("callouts")
                .onClick(() => {
                    this.openCalloutPicker(editor, context);
                });
        });

        if (!context) {
            return;
        }

        menu.addItem((item) => {
            item
                .setTitle("Remove callout")
                .setIcon("eraser")
                .setSection("callouts")
                .onClick(() => {
                    this.editorService.clearCalloutFromEditor(editor, context);
                });
        });
    }

    openCalloutPicker(editor, existingContext = null, pickerOptions = {}) {
        const activeType = existingContext?.calloutType || this.editorService.getActiveCalloutTypeFromEditor(editor);
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        const placeCursorOnNextLine = resolvePlaceCursorOnNextLine(
            this.placeCursorOnNextLineAfterInsert(),
            pickerOptions.useAlternateInsertionMode === true
        );

        const modal = new CalloutPickerModal(this.app, {
            controller: this,
            options,
            activeType,
            onChoose: (option) => {
                this.editorService.applyCalloutChoice(editor, option.id, existingContext, {
                    placeCursorOnNextLine
                });
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
            ...(option.groupAliases || []),
            ...(option.aliases || [])
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
}

module.exports = {
    CalloutMenuController
};
