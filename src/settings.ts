import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinition,
	SettingDefinitionItem,
	SettingDefinitionList,
} from 'obsidian';
import { createDefaultAnnotateBlockAppearance } from './annotate-block/defaults';
import { AnnotateBlockAppearance } from './annotate-block/types';
import { createFastGroupPreset, FastGroupPreset } from './fast-group';
import { createAnnotateBlockAppearanceSettingDefinitions } from './ui/annotate-block-appearance-settings';
import { createTextGroupAppearanceSettingDefinitions } from './ui/text-group-appearance-settings';

export interface BetterAnnotateSettings {
	devMode: boolean;
	useDefaultTextContent: boolean;
	defaultTextContent: string;
	defaultAnnotateAppearance: AnnotateBlockAppearance;
	fastGroupPresets: FastGroupPreset[];
}

export const DEFAULT_SETTINGS: BetterAnnotateSettings = {
	devMode: true,
	useDefaultTextContent: true,
	defaultTextContent: '',
	defaultAnnotateAppearance: createDefaultAnnotateBlockAppearance(),
	fastGroupPresets: [],
};

interface SettingsPlugin extends Plugin {
	settings: BetterAnnotateSettings;
	saveSettings(): Promise<void>;
}

export class BetterAnnotateSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Dev mode',
				desc: 'Enable development-only features.',
				control: {
					type: 'toggle',
					key: 'devMode',
				},
			},
			{
				name: 'Use default text content',
				desc: 'Fill new annotates with Text Content in development mode.',
				control: {
					type: 'toggle',
					key: 'useDefaultTextContent',
					disabled: () => !this.plugin.settings.devMode,
				},
			},
			...createAnnotateBlockAppearanceSettingDefinitions(
				this.plugin.settings.defaultAnnotateAppearance,
				{
					onChange: () => this.plugin.saveSettings(),
					sectionItems: {
						Text: [this.createDefaultTextContentDefinition()],
					},
				},
			),
			this.createFastGroupDefinition(),
		];
	}

	async setControlValue(key: string, value: unknown) {
		await super.setControlValue(key, value);

		if (key === 'devMode' || key === 'useDefaultTextContent') {
			this.update();
		}
	}

	private createDefaultTextContentDefinition(): SettingDefinition {
		return {
			name: 'Text content',
			desc: 'Only used when Dev mode and Use default text content are enabled.',
			render: (setting) => {
				const disabled = !(
					this.plugin.settings.devMode &&
					this.plugin.settings.useDefaultTextContent
				);
				setting.settingEl.toggleClass(
					'ba-annotate-setting-disabled',
					disabled,
				);
				setting.nameEl.setText(['Text', 'Content'].join(' '));
				setting.addTextArea((textArea) => {
					textArea.inputEl.rows = 5;
					textArea.inputEl.addClass('ba-annotate-textarea');
					textArea
						.setValue(this.plugin.settings.defaultTextContent)
						.setDisabled(disabled)
						.onChange(async (value) => {
							this.plugin.settings.defaultTextContent = value;
							await this.plugin.saveSettings();
						});
				});
			},
		};
	}

	private createFastGroupDefinition(): SettingDefinitionList {
		const presets = this.plugin.settings.fastGroupPresets;

		return {
			type: 'list',
			heading: 'Group presets',
			emptyState: 'No group presets.',
			addItem: {
				name: 'Add group preset',
				action: () => {
					void this.addFastGroupPreset(presets);
				},
			},
			onDelete: (index) => {
				void this.deleteFastGroupPreset(presets, index);
			},
			onReorder: (oldIndex, newIndex) => {
				void this.reorderFastGroupPresets(
					presets,
					oldIndex,
					newIndex,
				);
			},
			items: presets.map((preset) => ({
				type: 'page',
				name: preset.title || 'Untitled preset',
				desc: preset.description || 'Configure this group preset.',
				items: this.createFastGroupPresetDefinitions(preset),
			})),
		};
	}

	private async addFastGroupPreset(presets: FastGroupPreset[]) {
		presets.push(createFastGroupPreset(presets.length + 1));
		await this.plugin.saveSettings();
		this.update();
	}

	private async deleteFastGroupPreset(
		presets: FastGroupPreset[],
		index: number,
	) {
		presets.splice(index, 1);
		await this.plugin.saveSettings();
		this.update();
	}

	private async reorderFastGroupPresets(
		presets: FastGroupPreset[],
		oldIndex: number,
		newIndex: number,
	) {
		const [preset] = presets.splice(oldIndex, 1);
		if (!preset) return;

		presets.splice(newIndex, 0, preset);
		await this.plugin.saveSettings();
		this.update();
	}

	private createFastGroupPresetDefinitions(
		preset: FastGroupPreset,
	): SettingDefinitionItem[] {
		return [
			{
				name: 'Title',
				desc: 'Button text shown beside segments.',
				render: (setting: Setting) => {
					setting.addText((input) => {
						input
							.setValue(preset.title)
							.onChange(async (value) => {
								preset.title = value;
								await this.plugin.saveSettings();
							});
					});
				},
			},
			{
				name: 'Description',
				desc: 'Optional tooltip for the Fast Group button.',
				render: (setting: Setting) => {
					setting.addText((input) => {
						input
							.setValue(preset.description)
							.onChange(async (value) => {
								preset.description = value;
								await this.plugin.saveSettings();
							});
					});
				},
			},
			{
				name: 'Button color',
				render: (setting: Setting) => {
					setting.addColorPicker((colorPicker) => {
						colorPicker
							.setValue(preset.buttonColor)
							.onChange(async (value) => {
								preset.buttonColor = value;
								await this.plugin.saveSettings();
							});
					});
				},
			},
			{
				name: 'Button text color',
				render: (setting: Setting) => {
					setting.addColorPicker((colorPicker) => {
						colorPicker
							.setValue(preset.buttonTextColor)
							.onChange(async (value) => {
								preset.buttonTextColor = value;
								await this.plugin.saveSettings();
							});
					});
				},
			},
			...createTextGroupAppearanceSettingDefinitions(
				preset.appearance,
				{
					onChange: () => this.plugin.saveSettings(),
				},
			),
		];
	}
}
