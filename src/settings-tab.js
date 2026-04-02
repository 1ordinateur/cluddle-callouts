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
            .setName("Place cursor on next line after insert")
            .setDesc("When inserting a brand-new callout, starts the cursor on the blank quoted content line instead of the header line.")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.placeCursorOnNextLineAfterInsert())
                    .onChange(async (value) => {
                        this.plugin.settings.placeCursorOnNextLineAfterInsert = value;
                        await this.plugin.savePluginSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Alternate insert starts on next line")
            .setDesc("Used by the alternate insertion mode command. Bind that command to a hotkey in Obsidian if you want a shortcut such as Alt+Enter.")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.placeCursorOnNextLineAfterAlternateInsert())
                    .onChange(async (value) => {
                        this.plugin.settings.placeCursorOnNextLineAfterAlternateInsert = value;
                        await this.plugin.savePluginSettings();
                    });
            });
    }
}

module.exports = {
    CustomCalloutContextMenuSettingTab
};
