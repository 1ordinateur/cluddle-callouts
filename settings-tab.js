const { PluginSettingTab, Setting } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");

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
                        const parsed = Number(value);
                        this.plugin.settings.maxRowsPerColumn = Number.isFinite(parsed)
                            ? Math.min(24, Math.max(1, Math.round(parsed)))
                            : DEFAULT_SETTINGS.maxRowsPerColumn;
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
