import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings } from './settings';

// Remember to rename these classes and interfaces!

export default class HelloWorldPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload() {
		console.log('loading plugin');
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
