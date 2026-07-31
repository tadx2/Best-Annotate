import { Plugin } from 'obsidian';
import { registerAnnotateMenu } from './annotate';
import {
	BetterAnnotateSettings,
	BetterAnnotateSettingTab,
	DEFAULT_SETTINGS,
} from './settings';

export default class BetterAnnotatePlugin extends Plugin {
	settings!: BetterAnnotateSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new BetterAnnotateSettingTab(this.app, this));
		registerAnnotateMenu(this, this.settings);
	}

	private async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<BetterAnnotateSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
