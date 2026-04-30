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
            .setDesc("Controls the normal insert behavior for a brand-new callout. Press Alt+Enter in the picker to use the opposite behavior once.")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.placeCursorOnNextLineAfterInsert())
                    .onChange(async (value) => {
                        this.plugin.settings.placeCursorOnNextLineAfterInsert = value;
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Edited callout title color")
            .setDesc("Applies to rendered callout title text when the visible title differs from the default label for that callout.")
            .addColorPicker((colorPicker) => {
                colorPicker
                    .setValue(this.plugin.nonDefaultCalloutTitleColor())
                    .onChange(async (value) => {
                        this.plugin.settings.nonDefaultCalloutTitleColor = value;
                        await this.plugin.savePluginSettings();
                    });
            });

    }
}

module.exports = {
    CustomCalloutContextMenuSettingTab
};
