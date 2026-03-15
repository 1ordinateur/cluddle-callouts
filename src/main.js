const { Plugin } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
const { CalloutRegistry } = require("./callout-registry");
const { EditorCalloutService } = require("./editor-callout-service");
const { CalloutMenuController } = require("./callout-menu-controller");
const {
    clampRowsPerColumn,
    clampGroupColumns,
    clampModalWidthRem,
    clampModalHeightVh
} = require("./layout-settings");
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
            getMaxGroupColumns: () => this.getMaxGroupColumns(),
            getModalWidthRem: () => this.getModalWidthRem(),
            getModalHeightVh: () => this.getModalHeightVh(),
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
        return clampRowsPerColumn(this.settings.maxRowsPerColumn, DEFAULT_SETTINGS.maxRowsPerColumn);
    }

    getMaxGroupColumns() {
        return clampGroupColumns(this.settings.maxGroupColumns, DEFAULT_SETTINGS.maxGroupColumns);
    }

    getModalWidthRem() {
        return clampModalWidthRem(this.settings.modalWidthRem, DEFAULT_SETTINGS.modalWidthRem);
    }

    getModalHeightVh() {
        return clampModalHeightVh(this.settings.modalHeightVh, DEFAULT_SETTINGS.modalHeightVh);
    }

    preferCustomInSearch() {
        return this.settings.preferCustomInSearch !== false;
    }
};
