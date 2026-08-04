import { Plugin } from 'obsidian';
import { registerAnnotateMenu } from './annotate';
import { DEFAULT_FINAL_PREVIEW_SETTINGS } from './final-preview';
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
		const data = (await this.loadData()) as
			| Partial<BetterAnnotateSettings>
			| null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		this.settings.finalPreviewSettings = Object.assign(
			{},
			DEFAULT_FINAL_PREVIEW_SETTINGS,
			data?.finalPreviewSettings,
		);
		this.settings.fastGroupPresets = (this.settings.fastGroupPresets ?? []).map(
			(preset) => ({ ...preset, icon: preset.icon ?? '' }),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
