import {
	App,
	ButtonComponent,
	Plugin,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	ToggleComponent,
} from 'obsidian';
import {
	createFastGroupPreset,
	DEFAULT_BUTTON_TEXT_COLOR,
	DEFAULT_GROUP_COLOR,
	FastGroupPreset,
} from './fast-group';

const DEFAULT_TEST_TEXT =
	'This is a test text for debugging in developer mode.这是一段测试文字，用于开发者模式下调试。これは開発者モードでデバッグするためのテスト文章です。이것은 개발자 모드에서 디버깅하기 위한 테스트 텍스트입니다.Ceci est un texte de test pour le débogage en mode développeur.Dies ist ein Testtext zum Debuggen im Entwicklermodus.Este es un texto de prueba para depuración en modo desarrollador.Это тестовый текст для отладки в режиме разработчика.هذا نص اختباري للتصحيح في وضع المطور.';

export interface BetterAnnotateSettings {
	devMode: boolean;
	addTestTextOnCreate: boolean;
	testText: string;
	fastGroupPresets: FastGroupPreset[];
}

export const DEFAULT_SETTINGS: BetterAnnotateSettings = {
	devMode: true,
	addTestTextOnCreate: true,
	testText: DEFAULT_TEST_TEXT,
	fastGroupPresets: [],
};

interface SettingsPlugin extends Plugin {
	settings: BetterAnnotateSettings;
	saveSettings(): Promise<void>;
}

export class BetterAnnotateSettingTab extends PluginSettingTab {
	private expandedFastGroupPresetId: string | null = null;

	constructor(
		app: App,
		private readonly plugin: SettingsPlugin,
	) {
		super(app, plugin);
	}

	display() {
		this.containerEl.empty();
		let addTestTextSetting: Setting | null = null;
		let testTextSetting: Setting | null = null;
		let addTestTextToggle: ToggleComponent | null = null;
		let testTextArea: TextAreaComponent | null = null;
		let restoreTestTextButton: ButtonComponent | null = null;

		new Setting(this.containerEl)
			.setName('Dev mode')
			.setDesc('Enable development-only features.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.devMode)
					.onChange(async (value) => {
						this.plugin.settings.devMode = value;
						addTestTextToggle?.setDisabled(!value);
						testTextArea?.setDisabled(!value);
						restoreTestTextButton?.setDisabled(!value);
						this.setSettingDisabled(addTestTextSetting, !value);
						this.setSettingDisabled(testTextSetting, !value);
						await this.plugin.saveSettings();
					});
			});

		addTestTextSetting = new Setting(this.containerEl)
			.setName('Add test text when creating')
			.setDesc('Fill the create annotate modal with test text.')
			.addToggle((toggle) => {
				addTestTextToggle = toggle;
				toggle
					.setValue(this.plugin.settings.addTestTextOnCreate)
					.setDisabled(!this.plugin.settings.devMode)
					.onChange(async (value) => {
						this.plugin.settings.addTestTextOnCreate = value;
						await this.plugin.saveSettings();
					});
			});
		this.setSettingDisabled(
			addTestTextSetting,
			!this.plugin.settings.devMode,
		);

		testTextSetting = new Setting(this.containerEl)
			.setName('Test text')
			.setDesc('Text inserted into the create annotate modal.')
			.addTextArea((textArea) => {
				testTextArea = textArea;
				textArea.inputEl.rows = 6;
				textArea
					.setValue(this.plugin.settings.testText)
					.setDisabled(!this.plugin.settings.devMode)
					.onChange(async (value) => {
						this.plugin.settings.testText = value;
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) => {
				restoreTestTextButton = button;
				button
					.setButtonText('Restore')
					.setDisabled(!this.plugin.settings.devMode)
					.onClick(async () => {
						this.plugin.settings.testText = DEFAULT_TEST_TEXT;
						testTextArea?.setValue(DEFAULT_TEST_TEXT);
						await this.plugin.saveSettings();
					});
			});
		this.setSettingDisabled(testTextSetting, !this.plugin.settings.devMode);
		this.renderFastGroupSettings();
	}

	private renderFastGroupSettings() {
		new Setting(this.containerEl)
			.setName('Fast groups')
			.setDesc('Create reusable text group presets.')
			.addButton((button) => {
				button
					.setButtonText('Add fast group')
					.setCta()
					.onClick(async () => {
						const presets = this.plugin.settings.fastGroupPresets;
						const preset = createFastGroupPreset(presets.length + 1);
						presets.push(preset);
						this.expandedFastGroupPresetId = preset.id;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		for (const preset of this.plugin.settings.fastGroupPresets) {
			this.renderFastGroupPreset(preset);
		}
	}

	private renderFastGroupPreset(preset: FastGroupPreset) {
		const details = this.containerEl.createEl('details', {
			cls: 'ba-annotate-fast-group-preset',
		});
		details.open = preset.id === this.expandedFastGroupPresetId;
		const summary = details.createEl('summary', {
			text: preset.title || 'Untitled fast group',
		});
		const content = details.createDiv(
			'ba-annotate-fast-group-preset-content',
		);

		new Setting(content)
			.setName('Title')
			.setDesc('Button text shown beside segments.')
			.addText((input) => {
				input
					.setValue(preset.title)
					.onChange(async (value) => {
						preset.title = value;
						summary.setText(value || 'Untitled fast group');
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Description')
			.setDesc('Optional tooltip for the fast group button.')
			.addText((input) => {
				input
					.setValue(preset.description)
					.onChange(async (value) => {
						preset.description = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Button color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(preset.buttonColor ?? DEFAULT_GROUP_COLOR)
					.onChange(async (value) => {
						preset.buttonColor = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Button text color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(
						preset.buttonTextColor ?? DEFAULT_BUTTON_TEXT_COLOR,
					)
					.onChange(async (value) => {
						preset.buttonTextColor = value;
						await this.plugin.saveSettings();
					});
			});

		content.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Text',
		});
		new Setting(content)
			.setName('Text color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(preset.textColor)
					.onChange(async (value) => {
						preset.textColor = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Text background')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(
						preset.textBackgroundColor ?? DEFAULT_GROUP_COLOR,
					)
					.onChange(async (value) => {
						preset.textBackgroundColor = value;
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((button) => {
				button
					.setIcon('x')
					.setTooltip('Clear background')
					.onClick(async () => {
						preset.textBackgroundColor = undefined;
						await this.plugin.saveSettings();
					});
			});

		content.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Underline',
		});
		new Setting(content)
			.setName('Show underline')
			.addToggle((toggle) => {
				toggle
					.setValue(preset.underline)
					.onChange(async (value) => {
						preset.underline = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Underline color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(preset.underlineColor)
					.onChange(async (value) => {
						preset.underlineColor = value;
						await this.plugin.saveSettings();
					});
			});

		content.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Annotate',
		});
		new Setting(content)
			.setName('Annotate text')
			.addText((input) => {
				input
					.setValue(preset.annotate)
					.onChange(async (value) => {
						preset.annotate = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Annotate color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(preset.annotateColor)
					.onChange(async (value) => {
						preset.annotateColor = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Show annotate')
			.addToggle((toggle) => {
				toggle
					.setValue(preset.annotateVisible)
					.onChange(async (value) => {
						preset.annotateVisible = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Display below')
			.addToggle((toggle) => {
				toggle
					.setValue(preset.annotatePosition === 'under')
					.onChange(async (value) => {
						preset.annotatePosition = value ? 'under' : 'over';
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Compact layout')
			.addToggle((toggle) => {
				toggle
					.setValue(preset.annotateCompact)
					.onChange(async (value) => {
						preset.annotateCompact = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(content)
			.setName('Delete preset')
			.addButton((button) => {
				button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						this.expandedFastGroupPresetId = null;
						this.plugin.settings.fastGroupPresets =
							this.plugin.settings.fastGroupPresets.filter(
								(item) => item.id !== preset.id,
							);
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}

	private setSettingDisabled(setting: Setting | null, disabled: boolean) {
		setting?.settingEl.toggleClass(
			'ba-annotate-setting-disabled',
			disabled,
		);
	}
}
