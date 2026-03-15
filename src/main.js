const { Plugin } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
const { CalloutRegistry } = require("./callout-registry");
const { EditorCalloutService } = require("./editor-callout-service");
const { CalloutMenuController } = require("./callout-menu-controller");
const { CustomCalloutContextMenuSettingTab } = require("./settings-tab");

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
