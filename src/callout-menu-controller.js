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
        const hasSelection = editor.getSelection().length > 0;
        const title = context
            ? hasSelection
                ? "Wrap selection in nested callout"
                : "Insert nested callout"
            : hasSelection
                ? "Wrap selection in callout"
                : "Insert callout";

        menu.addItem((item) => {
            item
                .setTitle(title)
                .setIcon("panel-top-open")
                .setSection("callouts")
                .onClick(() => {
                    this.openCalloutPicker(editor);
                });
        });

        if (!context) {
            return;
        }

        menu.addItem((item) => {
            item
                .setTitle("Change current callout type")
                .setIcon("pencil")
                .setSection("callouts")
                .onClick(() => {
                    this.openRenameCalloutPicker(editor, context);
                });
        });

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

    openCalloutPicker(editor) {
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        const modal = new CalloutPickerModal(this.app, {
            controller: this,
            options,
            activeType: "",
            includeUtility: false,
            onChoose: (option, chooseOptions = {}) => {
                this.editorService.applyCalloutChoice(editor, option.id, {
                    placeCursorOnNextLine: resolvePlaceCursorOnNextLine(
                        this.placeCursorOnNextLineAfterInsert(),
                        chooseOptions.useAlternateInsertionMode === true
                    )
                });
            }
        });
        modal.open();
    }

    openRenameCalloutPicker(editor, existingContext = null) {
        const context = existingContext || this.editorService.findCalloutContext(editor);
        if (!context) {
            return;
        }

        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        const modal = new CalloutPickerModal(this.app, {
            controller: this,
            options,
            activeType: context.calloutType,
            includeUtility: true,
            onChoose: (option) => {
                this.editorService.renameCalloutType(editor, option.id, context);
            },
            onClear: () => {
                this.editorService.clearCalloutFromEditor(editor, context);
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
