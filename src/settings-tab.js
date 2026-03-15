const { PluginSettingTab, Setting } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
const {
    clampRowsPerColumn,
    clampGroupColumns,
    clampModalWidthRem,
    clampModalHeightVh
} = require("./layout-settings");

class CustomCalloutContextMenuSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Max rows per column")
            .setDesc("Controls how many callout options appear before the picker starts a new column.")
            .addText((text) => {
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.maxRowsPerColumn))
                    .setValue(String(this.plugin.getMaxRowsPerColumn()))
                    .onChange(async (value) => {
                        this.plugin.settings.maxRowsPerColumn = clampRowsPerColumn(
                            value,
                            DEFAULT_SETTINGS.maxRowsPerColumn
                        );
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Total columns")
            .setDesc("Controls how many columns the picker shows before it wraps to a new row. Each metadata type keeps its own column.")
            .addText((text) => {
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.maxGroupColumns))
                    .setValue(String(this.plugin.getMaxGroupColumns()))
                    .onChange(async (value) => {
                        this.plugin.settings.maxGroupColumns = clampGroupColumns(
                            value,
                            DEFAULT_SETTINGS.maxGroupColumns
                        );
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Picker width (rem)")
            .setDesc("Controls the maximum width of the popup window.")
            .addText((text) => {
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.modalWidthRem))
                    .setValue(String(this.plugin.getModalWidthRem()))
                    .onChange(async (value) => {
                        this.plugin.settings.modalWidthRem = clampModalWidthRem(
                            value,
                            DEFAULT_SETTINGS.modalWidthRem
                        );
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Picker height (vh)")
            .setDesc("Controls the maximum height of the popup window as a percentage of the viewport.")
            .addText((text) => {
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.modalHeightVh))
                    .setValue(String(this.plugin.getModalHeightVh()))
                    .onChange(async (value) => {
                        this.plugin.settings.modalHeightVh = clampModalHeightVh(
                            value,
                            DEFAULT_SETTINGS.modalHeightVh
                        );
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Prefer custom callouts in search")
            .setDesc("Biases fuzzy search toward your CSS-defined custom callouts before built-in Obsidian ones.")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.preferCustomInSearch())
                    .onChange(async (value) => {
                        this.plugin.settings.preferCustomInSearch = value;
                        await this.plugin.savePluginSettings();
                    });
            });
    }
}

module.exports = {
    CustomCalloutContextMenuSettingTab
};
