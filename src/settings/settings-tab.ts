import { PluginSettingTab, Setting } from "obsidian";
import { Logger } from "../logger";
import type ObsidianDiscordRPC from "../main";

export class DiscordRPCSettingsTab extends PluginSettingTab {
  public logger: Logger = new Logger();

  private refreshActivity(plugin: ObsidianDiscordRPC): void {
    const file = plugin.currentFile;
    if (!file) {
      return;
    }

    void plugin.setActivity(
      this.app.vault.getName(),
      file.basename,
      file.extension
    );
  }

  display(): void {
    let { containerEl } = this;
    const plugin: ObsidianDiscordRPC = (this as any).plugin;

    containerEl.empty();
    containerEl.createEl("h2", { text: "Discord Rich Presence Settings" });

    containerEl.createEl("h3", { text: "Vault Name Settings" });
    new Setting(containerEl)
      .setName("Privacy Mode")
      .setDesc("Enable this to hide the name of the vault and Hide file names")
      .addToggle((boolean) =>
        boolean.setValue(plugin.settings.privacyMode).onChange((value) => {
          plugin.settings.privacyMode = value;
          plugin.saveData(plugin.settings);

          if (boolean.getValue()) {
            this.logger.logIgnoreNoNotice("Privacy Mode Enabled");
          } else {
            this.logger.logIgnoreNoNotice("Privacy Mode Disabled");
          }

          plugin.setActivity("", "", "");
        })
      );
    new Setting(containerEl)
      .setName("Show Vault Name")
      .setDesc(
        "Enable this to show the name of the vault you are working with."
      )
      .addToggle((boolean) =>
        boolean.setValue(plugin.settings.showVaultName).onChange((value) => {
          plugin.settings.showVaultName = value;
          plugin.saveData(plugin.settings);

          if (boolean.getValue()) {
            this.logger.logIgnoreNoNotice("Vault Name is now Visible");
          } else {
            this.logger.logIgnoreNoNotice("Vault Name is no longer Visible");
          }

          this.refreshActivity(plugin);
        })
      );

    new Setting(containerEl)
      .setName("Set Custom Vault Name")
      .setDesc(
        "Change the vault name shown publicly. Leave blank to use your actual vault name."
      )
      .addText((text) =>
        text.setValue(plugin.settings.customVaultName).onChange((value) => {
          plugin.settings.customVaultName = value;
          plugin.saveData(plugin.settings);

          this.refreshActivity(plugin);
        })
      );

    containerEl.createEl("h3", { text: "File Name Settings" });
    new Setting(containerEl)
      .setName("Show Current File Name")
      .setDesc("Enable this to show the name of the file you are working on.")
      .addToggle((boolean) =>
        boolean
          .setValue(plugin.settings.showCurrentFileName)
          .onChange((value) => {
            plugin.settings.showCurrentFileName = value;
            plugin.saveData(plugin.settings);

            if (boolean.getValue()) {
              this.logger.logIgnoreNoNotice("File Name is now Visable");
            } else {
              this.logger.logIgnoreNoNotice("File Name is no longer Visable");
            }

            this.refreshActivity(plugin);
          })
      );

    new Setting(containerEl)
      .setName("Show File Extension")
      .setDesc("Enable this to show file extension.")
      .addToggle((boolean) =>
        boolean
          .setValue(plugin.settings.showFileExtension)
          .onChange((value) => {
            plugin.settings.showFileExtension = value;
            plugin.saveData(plugin.settings);

            this.refreshActivity(plugin);
          })
      );

    containerEl.createEl("h3", { text: "Time Settings" });
    new Setting(containerEl)
      .setName("Use Obsidian Total Time")
      .setDesc(
        "Enable to use the total time you have been using Obsidian, instead of the time spent editing a single file."
      )
      .addToggle((boolean) => {
        boolean.setValue(plugin.settings.useLoadedTime).onChange((value) => {
          plugin.settings.useLoadedTime = value;
          plugin.saveData(plugin.settings);

          this.refreshActivity(plugin);
        });
      });

    containerEl.createEl("h3", { text: "Status Bar Settings" });
    new Setting(containerEl)
      .setName("Automatically hide Status Bar")
      .setDesc(
        "Automatically hide status bar after successfully connecting to Discord."
      )
      .addToggle((boolean) => {
        boolean
          .setValue(plugin.settings.autoHideStatusBar)
          .onChange((value) => {
            plugin.settings.autoHideStatusBar = value;
            plugin.saveData(plugin.settings);

            this.refreshActivity(plugin);
          });
      });
    
      new Setting(containerEl)
      .setName("Show Connected Time")
      .setDesc(
        "Show time spent editing file or time connected to Discord in the status bar."
      )
      .addToggle((boolean) => {
        boolean.setValue(plugin.settings.showConnectionTimer).onChange((value) => {
          plugin.settings.showConnectionTimer = value;
          plugin.saveData(plugin.settings);

          this.refreshActivity(plugin);
          // needed to make timer disappear, otherwise it will freeze
          plugin.statusBar.displayState(plugin.getState(), plugin.settings.autoHideStatusBar);
        });
      });

    containerEl.createEl("h3", { text: "Startup Settings" });
    new Setting(containerEl)
      .setName("Automatically Connect to Discord")
      .setDesc(
        "Automatically connect to Discord on startup. You can always click the status bar to manually connect."
      )
      .addToggle((boolean) => {
        boolean.setValue(plugin.settings.connectOnStart).onChange((value) => {
          plugin.settings.connectOnStart = value;
          plugin.saveData(plugin.settings);
          plugin.setAutoReconnect(value);

          this.refreshActivity(plugin);
        });
      });

    containerEl.createEl("h3", { text: "Notice Settings" });
    new Setting(containerEl)
      .setName("Show Notices")
      .setDesc("Enable this to show connection Notices.")
      .addToggle((boolean) =>
        boolean.setValue(plugin.settings.showPopups).onChange((value) => {
          plugin.settings.showPopups = value;
          plugin.saveData(plugin.settings);

          if (boolean.getValue()) {
            this.logger.logIgnoreNoNotice("Notices Enabled");
          } else {
            this.logger.logIgnoreNoNotice("Notices Disabled");
          }

          this.refreshActivity(plugin);
        })
      );
  }
}
