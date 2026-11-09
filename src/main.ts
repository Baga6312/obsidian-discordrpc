import type { Client } from "discord-rpc";
import * as path from "path";
import { FileSystemAdapter, Plugin, PluginManifest, TFile } from "obsidian";
import { Logger } from "./logger";
import { DiscordRPCSettings, PluginState } from "./settings/settings";
import { DiscordRPCSettingsTab } from "./settings/settings-tab";
import { StatusBar } from "./status-bar";

export default class ObsidianDiscordRPC extends Plugin {
  private static readonly reconnectInterval = 5000;
  public state: PluginState;
  public settings: DiscordRPCSettings;
  public statusBar: StatusBar;
  public rpc: Client;
  public logger: Logger = new Logger();
  public currentFile: TFile;
  public loadedTime: Date;
  public lastSetTime: Date;
  private reconnectRequested = false;
  private reconnectFailureReported = false;

  setState(state: PluginState) {
    this.state = state;
  }

  getState(): PluginState {
    return this.state;
  }

  setAutoReconnect(enabled: boolean): void {
    this.reconnectRequested = enabled;
    if (enabled && this.getState() === PluginState.disconnected) {
      void this.connectDiscord();
    }
  }

  public getApp(): any {
    return this.app;
  }

  public getPluginManifest(): PluginManifest {
    return this.manifest;
  }

  async onload() {
    let statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl);

    this.settings = (await this.loadData()) || new DiscordRPCSettings();

    this.registerEvent(
      this.app.workspace.on("file-open", this.onFileOpen, this)
    );

    this.registerInterval(window.setInterval(async () => {
      if (this.settings.showConnectionTimer && this.getState() == PluginState.connected){
        this.statusBar.displayTimer(this.settings.useLoadedTime ? this.loadedTime : this.lastSetTime);
      }
    }, 500));

    this.registerInterval(window.setInterval(() => {
      if (this.reconnectRequested && this.getState() === PluginState.disconnected) {
        void this.connectDiscord();
      }
    }, ObsidianDiscordRPC.reconnectInterval));

    this.registerDomEvent(statusBarEl, "click", async () => {
      if (this.getState() == PluginState.disconnected) {
        this.reconnectRequested = true;
        this.reconnectFailureReported = false;
        await this.connectDiscord();
      } else if (this.getState() == PluginState.connected) {
        await this.disconnectDiscord();
      }
    });

    this.addSettingTab(new DiscordRPCSettingsTab(this.app, this));

    this.addCommand({
      id: "reconnect-discord",
      name: "Reconnect to Discord",
      callback: async () => {
        this.reconnectRequested = true;
        this.reconnectFailureReported = false;
        await this.connectDiscord();
      },
    });

    this.addCommand({
      id: "disconnect-discord",
      name: "Disconnect from Discord",
      callback: async () => await this.disconnectDiscord(),
    });

    this.setState(PluginState.disconnected);
    this.statusBar.displayState(
      this.getState(),
      this.settings.autoHideStatusBar
    );

    if (this.settings.connectOnStart) {
      this.setAutoReconnect(true);
    }
  }

  async onFileOpen(file: TFile) {
    this.currentFile = file;
    if (this.getState() === PluginState.connected) {
      await this.setActivity(
        this.app.vault.getName(),
        file.basename,
        file.extension
      );
    }
  }

  async onunload() {
    this.reconnectRequested = false;
    await this.saveData(this.settings);
    if (this.rpc) {
      this.rpc.clearActivity();
      this.rpc.destroy();
    }
  }

  async connectDiscord(): Promise<void> {
    if (this.getState() === PluginState.connecting) {
      return;
    }

    this.loadedTime = new Date();
    this.lastSetTime = new Date();

    this.setState(PluginState.connecting);
    this.statusBar.displayState(
      this.getState(),
      this.settings.autoHideStatusBar
    );

    try {
      if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
        throw new Error("The vault does not use a local file-system adapter");
      }

      const rpcPath = path.join(
        this.app.vault.adapter.getBasePath(),
        this.manifest.dir,
        "discord-rpc.js"
      );
      const nativeProcess = process as NodeJS.Process & {
        getBuiltinModule?: (name: string) => {
          createRequire(filename: string): NodeRequire;
        };
        mainModule?: { require(id: string): unknown };
      };
      let rpcModule: { Client: typeof Client };

      if (nativeProcess.getBuiltinModule) {
        const nodeRequire =
          nativeProcess.getBuiltinModule("module").createRequire(rpcPath);
        rpcModule = nodeRequire(rpcPath) as { Client: typeof Client };
      } else if (nativeProcess.mainModule) {
        rpcModule = nativeProcess.mainModule.require(rpcPath) as {
          Client: typeof Client;
        };
      } else {
        throw new Error("Native Node module loading is unavailable");
      }

      const RpcClient = rpcModule.Client;
      this.rpc = new RpcClient({
        transport: "ipc",
      });

      this.rpc.once("ready", () => {
        this.setState(PluginState.connected);
        this.statusBar.displayState(
          this.getState(),
          this.settings.autoHideStatusBar
        );
        this.reconnectRequested = false;
        this.reconnectFailureReported = false;
        this.logger.log("Connected to Discord", this.settings.showPopups);
      });

      await this.rpc.login({
        clientId: "763813185022197831",
      });
      await this.setActivity(this.app.vault.getName(), "...", "");
    } catch (error) {
      this.setState(PluginState.disconnected);
      this.statusBar.displayState(
        this.getState(),
        this.settings.autoHideStatusBar
      );
      if (this.rpc) {
        this.rpc.destroy();
        this.rpc = undefined;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      console.error("discordrpc: Failed to connect to Discord", error);
      this.logger.log(
        `Failed to connect to Discord: ${message}`,
        this.settings.showPopups && !this.reconnectFailureReported
      );
      this.reconnectFailureReported = true;
    }
  }

  async disconnectDiscord(): Promise<void> {
    this.reconnectRequested = false;
    this.reconnectFailureReported = false;
    if (this.rpc) {
      this.rpc.clearActivity();
      this.rpc.destroy();
      this.rpc = undefined;
    }
    this.setState(PluginState.disconnected);
    this.statusBar.displayState(
      this.getState(),
      this.settings.autoHideStatusBar
    );
    this.logger.log("Disconnected from Discord", this.settings.showPopups);
  }

  async setActivity(
    vaultName: string,
    fileName: string,
    fileExtension: string
  ): Promise<void> {
    if (this.getState() === PluginState.connected) {
      let vault: string;
      if (this.settings.customVaultName === "") {
        vault = vaultName;
      } else {
        vault = this.settings.customVaultName;
      }

      let file: string;
      if (this.settings.showFileExtension) {
        file = fileName + "." + fileExtension;
      } else {
        file = fileName;
      }

      let date: Date;
      if (this.settings.useLoadedTime) {
        date = this.loadedTime;
      } else {
        date = new Date();
      }
      this.lastSetTime = date;

      if (this.settings.privacyMode) {
        await this.rpc.setActivity({
          details: `Editing Notes`,
          state: `Working in a Vault`,
          startTimestamp: date,
          largeImageKey: "logo",
          largeImageText: "Obsidian",
        });
      } else if (
        this.settings.showVaultName &&
        this.settings.showCurrentFileName
      ) {
        await this.rpc.setActivity({
          details: `Editing ${file}`,
          state: `Vault: ${vault}`,
          startTimestamp: date,
          largeImageKey: "logo",
          largeImageText: "Obsidian",
        });
      } else if (this.settings.showVaultName) {
        await this.rpc.setActivity({
          state: `Vault: ${vault}`,
          startTimestamp: date,
          largeImageKey: "logo",
          largeImageText: "Obsidian",
        });
      } else if (this.settings.showCurrentFileName) {
        await this.rpc.setActivity({
          details: `Editing ${file}`,
          startTimestamp: date,
          largeImageKey: "logo",
          largeImageText: "Obsidian",
        });
      } else {
        await this.rpc.setActivity({
          startTimestamp: date,
          largeImageKey: "logo",
          largeImageText: "Obsidian",
        });
      }
    }
  }
}
