import {
	App,
	ButtonComponent,
	Plugin,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	ToggleComponent,
} from 'obsidian';

const DEFAULT_TEST_TEXT =
	'This is a test text for debugging in developer mode.这是一段测试文字，用于开发者模式下调试。これは開発者モードでデバッグするためのテスト文章です。이것은 개발자 모드에서 디버깅하기 위한 테스트 텍스트입니다.Ceci est un texte de test pour le débogage en mode développeur.Dies ist ein Testtext zum Debuggen im Entwicklermodus.Este es un texto de prueba para depuración en modo desarrollador.Это тестовый текст для отладки в режиме разработчика.هذا نص اختباري للتصحيح في وضع المطور.';

export interface BetterAnnotateSettings {
	devMode: boolean;
	addTestTextOnCreate: boolean;
	testText: string;
}

export const DEFAULT_SETTINGS: BetterAnnotateSettings = {
	devMode: true,
	addTestTextOnCreate: true,
	testText: DEFAULT_TEST_TEXT,
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
	}

	private setSettingDisabled(setting: Setting | null, disabled: boolean) {
		setting?.settingEl.toggleClass(
			'ba-annotate-setting-disabled',
			disabled,
		);
	}
}
