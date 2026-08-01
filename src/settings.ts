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

const DEFAULT_TEST_TEXT =
	'This is a test text for debugging in developer mode.这是一段测试文字，用于开发者模式下调试。これは開発者モードでデバッグするためのテスト文章です。이것은 개발자 모드에서 디버깅하기 위한 테스트 텍스트입니다.Ceci est un texte de test pour le débogage en mode développeur.Dies ist ein Testtext zum Debuggen im Entwicklermodus.Este es un texto de prueba para depuración en modo desarrollador.Это тестовый текст для отладки в режиме разработчика.هذا نص اختباري للتصحيح في وضع المطور.';

export interface BetterAnnotateSettings {
	devMode: boolean;
	addTestTextOnCreate: boolean;
	testText: string;
	defaultTextContent: string;
	defaultAnnotateAppearance: AnnotateBlockAppearance;
	fastGroupPresets: FastGroupPreset[];
}

export const DEFAULT_SETTINGS: BetterAnnotateSettings = {
	devMode: true,
	addTestTextOnCreate: true,
	testText: DEFAULT_TEST_TEXT,
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
				name: 'Add test text when creating',
				desc: 'Fill the create annotate modal with test text.',
				control: {
					type: 'toggle',
					key: 'addTestTextOnCreate',
					disabled: () => !this.plugin.settings.devMode,
				},
			},
			this.createTestTextDefinition(),
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

		if (key === 'devMode') {
			this.update();
		}
	}

	private createTestTextDefinition(): SettingDefinitionItem {
		return {
			name: 'Test text',
			desc: 'Text inserted into the create annotate modal.',
			render: (setting) => {
				const disabled = !this.plugin.settings.devMode;
				setting.settingEl.toggleClass(
					'ba-annotate-setting-disabled',
					disabled,
				);

				setting
					.addTextArea((textArea) => {
						textArea.inputEl.rows = 6;
						textArea
							.setValue(this.plugin.settings.testText)
							.setDisabled(disabled)
							.onChange(async (value) => {
								this.plugin.settings.testText = value;
								await this.plugin.saveSettings();
							});
					})
					.addButton((button) => {
						button
							.setButtonText('Restore')
							.setDisabled(disabled)
							.onClick(async () => {
								this.plugin.settings.testText = DEFAULT_TEST_TEXT;
								await this.plugin.saveSettings();
								this.update();
							});
					});
			},
		};
	}

	private createDefaultTextContentDefinition(): SettingDefinition {
		return {
			name: 'Text content',
			desc: 'Default text for new annotates. Development test text has higher priority when enabled.',
			render: (setting) => {
				setting.nameEl.setText(['Text', 'Content'].join(' '));
				setting.addTextArea((textArea) => {
					textArea.inputEl.rows = 5;
					textArea.inputEl.addClass('ba-annotate-textarea');
					textArea
						.setValue(this.plugin.settings.defaultTextContent)
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
			heading: 'Fast groups',
			emptyState: 'No fast groups.',
			addItem: {
				name: 'Add fast group',
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
				name: preset.title || 'Untitled fast group',
				desc: preset.description || 'Configure this Fast Group preset.',
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
