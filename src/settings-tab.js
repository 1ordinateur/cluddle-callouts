const { PluginSettingTab, Setting } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
const { clampRowsPerColumn, clampGroupColumns } = require("./layout-settings");

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
