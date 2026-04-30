const { MarkdownView, Plugin } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
const { CalloutRegistry } = require("./callout-registry");
const { EditorCalloutService } = require("./editor-callout-service");
const { CalloutMenuController } = require("./callout-menu-controller");
const { extractCalloutId, hasNonDefaultCalloutTitle } = require("./callout-title-style");
const { CustomCalloutContextMenuSettingTab } = require("./settings-tab");

module.exports = class CustomCalloutContextMenuPlugin extends Plugin {
    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.calloutTitleObserver = null;
        this.calloutTitleRefreshFrame = 0;

        this.registry = new CalloutRegistry(this.app);
        this.editorService = new EditorCalloutService();
        this.menuController = new CalloutMenuController({
            app: this.app,
            registry: this.registry,
            editorService: this.editorService,
            preferCustomInSearch: () => this.preferCustomInSearch(),
            placeCursorOnNextLineAfterInsert: () => this.placeCursorOnNextLineAfterInsert()
        });

        await this.registry.refresh();
        this.registerEvent(this.app.workspace.on("css-change", () => {
            this.registry.refresh();
        }));
        this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
            this.menuController.addEditorMenuItems(menu, editor);
        }));
        this.registerEvent(this.app.workspace.on("layout-change", () => {
            this.scheduleRefreshRenderedCalloutTitles();
        }));
        this.registerDomEvent(document, "keydown", (event) => {
            this.handleNestedCalloutEnterKey(event);
        }, { capture: true });

        this.addCommand({
            id: "open-callout-picker",
            name: "Open callout picker",
            editorCallback: (editor) => {
                this.menuController.openCalloutPicker(editor);
            }
        });

        this.addCommand({
            id: "rename-current-callout-type",
            name: "Rename current callout type",
            editorCallback: (editor) => {
                this.menuController.openRenameCalloutPicker(editor);
            }
        });

        this.addSettingTab(new CustomCalloutContextMenuSettingTab(this.app, this));
        this.applyConfiguredCalloutTitleColor();
        this.startCalloutTitleObserver();
    }

    onunload() {
        this.stopCalloutTitleObserver();
        this.clearConfiguredCalloutTitleColor();
        this.menuController?.unload();
        this.registry?.unload();
    }

    async savePluginSettings() {
        await this.saveData(this.settings);
        this.applyConfiguredCalloutTitleColor();
        this.scheduleRefreshRenderedCalloutTitles();
    }

    preferCustomInSearch() {
        return this.settings.preferCustomInSearch !== false;
    }

    placeCursorOnNextLineAfterInsert() {
        return this.settings.placeCursorOnNextLineAfterInsert === true;
    }

    handleNestedCalloutEnterKey(event) {
        if (
            event.key !== "Enter"
            || event.shiftKey
            || event.altKey
            || event.ctrlKey
            || event.metaKey
            || event.isComposing
        ) {
            return;
        }

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const target = event.target;
        if (
            !activeView
            || !(target instanceof Element)
            || !activeView.containerEl.contains(target)
            || !target.closest(".cm-editor")
        ) {
            return;
        }

        if (this.editorService.handleNestedCalloutEnter(activeView.editor)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    nonDefaultCalloutTitleColor() {
        return this.settings.nonDefaultCalloutTitleColor || DEFAULT_SETTINGS.nonDefaultCalloutTitleColor;
    }

    startCalloutTitleObserver() {
        if (
            typeof document === "undefined"
            || typeof MutationObserver === "undefined"
            || !document.body
        ) {
            return;
        }

        this.stopCalloutTitleObserver();
        this.calloutTitleObserver = new MutationObserver((mutationRecords) => {
            if (mutationRecords.some((record) => this.mutationTouchesCallouts(record))) {
                this.scheduleRefreshRenderedCalloutTitles();
            }
        });
        this.calloutTitleObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        this.scheduleRefreshRenderedCalloutTitles();
    }

    stopCalloutTitleObserver() {
        if (this.calloutTitleObserver) {
            this.calloutTitleObserver.disconnect();
            this.calloutTitleObserver = null;
        }

        if (this.calloutTitleRefreshFrame) {
            window.cancelAnimationFrame(this.calloutTitleRefreshFrame);
            this.calloutTitleRefreshFrame = 0;
        }

        if (typeof document !== "undefined") {
            for (const calloutEl of document.querySelectorAll(".custom-callout-has-edited-title")) {
                calloutEl.classList.remove("custom-callout-has-edited-title");
            }
        }
    }

    mutationTouchesCallouts(record) {
        if (!record) {
            return false;
        }

        if (record.type === "characterData") {
            return this.nodeTouchesCallouts(record.target);
        }

        return [...record.addedNodes, ...record.removedNodes].some((node) => this.nodeTouchesCallouts(node));
    }

    nodeTouchesCallouts(node) {
        if (!node) {
            return false;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            return this.nodeTouchesCallouts(node.parentElement || null);
        }

        if (!(node instanceof Element)) {
            return false;
        }

        return node.matches(".callout, .callout-title, .callout-title-inner, .callout-title-text, .callout-title-content, .cm-callout-title")
            || Boolean(node.querySelector(".callout, .callout-title, .callout-title-inner, .callout-title-text, .callout-title-content, .cm-callout-title"));
    }

    scheduleRefreshRenderedCalloutTitles() {
        if (typeof document === "undefined" || !document.body || this.calloutTitleRefreshFrame) {
            return;
        }

        this.calloutTitleRefreshFrame = window.requestAnimationFrame(() => {
            this.calloutTitleRefreshFrame = 0;
            this.refreshRenderedCalloutTitles();
        });
    }

    refreshRenderedCalloutTitles() {
        if (typeof document === "undefined") {
            return;
        }

        for (const calloutEl of document.querySelectorAll(".callout")) {
            const calloutId = extractCalloutId(
                calloutEl.getAttribute("data-callout")
                || calloutEl.getAttribute("data-callout-metadata")
                || ""
            );
            const titleTextEl = this.getRenderedCalloutTitleTextElement(calloutEl);

            if (!calloutId || !titleTextEl) {
                calloutEl.classList.remove("custom-callout-has-edited-title");
                continue;
            }

            calloutEl.classList.toggle(
                "custom-callout-has-edited-title",
                hasNonDefaultCalloutTitle(calloutId, titleTextEl.textContent || "")
            );
        }
    }

    getRenderedCalloutTitleTextElement(calloutEl) {
        if (!calloutEl) {
            return null;
        }

        return calloutEl.querySelector(
            ".callout-title-text, .callout-title-inner, .callout-title-content, .cm-callout-title, .callout-title"
        );
    }

    applyConfiguredCalloutTitleColor() {
        if (typeof document === "undefined") {
            return;
        }

        document.documentElement.style.setProperty(
            "--custom-callout-nondefault-title-color",
            this.nonDefaultCalloutTitleColor()
        );
    }

    clearConfiguredCalloutTitleColor() {
        if (typeof document === "undefined") {
            return;
        }

        document.documentElement.style.removeProperty("--custom-callout-nondefault-title-color");
    }
};
