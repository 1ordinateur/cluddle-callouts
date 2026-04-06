const { PluginSettingTab, Setting } = require("obsidian");

class CustomCalloutContextMenuSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

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

        new Setting(containerEl)
            .setName("Default insert starts on next line")
            .setDesc("Controls the normal insert behavior for a brand-new callout. The alternate insertion mode command uses the opposite behavior.")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.placeCursorOnNextLineAfterInsert())
                    .onChange(async (value) => {
                        this.plugin.settings.placeCursorOnNextLineAfterInsert = value;
                        await this.plugin.savePluginSettings();
                    });
            });

    }
}

module.exports = {
    CustomCalloutContextMenuSettingTab
};
