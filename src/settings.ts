import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinition,
	SettingDefinitionGroup,
	SettingDefinitionItem,
	SettingDefinitionList,
	SettingPage,
	setIcon,
} from 'obsidian';
import { createDefaultAnnotateBlockAppearance } from './annotate-block/defaults';
import { AnnotateBlockAppearance } from './annotate-block/types';
import {
	createFastGroupPreset,
	FastGroupPreset,
	parseFastGroupPresets,
	serializeFastGroupPresets,
} from './fast-group';
import {
	DEFAULT_FINAL_PREVIEW_SETTINGS,
	FinalPreviewSettings,
} from './final-preview';
import { createAnnotateBlockAppearanceSettingDefinitions } from './ui/annotate-block-appearance-settings';
import { renderTextGroupAppearanceSettings } from './ui/text-group-appearance-settings';
import { appendAnnotatedText } from './text-group/dom';
import {
	ConfirmModal,
	EditFastGroupPresetsModal,
} from './ui/edit-presets-modal';

export interface BetterAnnotateSettings {
	devMode: boolean;
	useDefaultTextContent: boolean;
	defaultTextContent: string;
	defaultAnnotateAppearance: AnnotateBlockAppearance;
	finalPreviewSettings: FinalPreviewSettings;
	fastGroupPresets: FastGroupPreset[];
}

export const DEFAULT_SETTINGS: BetterAnnotateSettings = {
	devMode: true,
	useDefaultTextContent: true,
	defaultTextContent: '',
	defaultAnnotateAppearance: createDefaultAnnotateBlockAppearance(),
	finalPreviewSettings: { ...DEFAULT_FINAL_PREVIEW_SETTINGS },
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
			this.createGroupPresetDefinition(),
			this.createFinalPreviewSettingsDefinition(),
			this.createFastGroupDefinition(),
			this.createDeveloperDefinition(),
		];
	}

	async setControlValue(key: string, value: unknown) {
		await super.setControlValue(key, value);

		if (key === 'devMode' || key === 'useDefaultTextContent') {
			this.update();
		}
	}

	private createGroupPresetDefinition(): SettingDefinitionGroup {
		return {
			type: 'group',
			heading: 'Group preset',
			items: [
				{
					type: 'page',
					name: 'Default group preset',
					desc: 'Default configuration applied to group buttons.',
					items: createAnnotateBlockAppearanceSettingDefinitions(
						this.plugin.settings.defaultAnnotateAppearance,
						{
							onChange: () => this.plugin.saveSettings(),
							sectionItems: {
								Text: [
									this.createDefaultTextContentDefinition(),
								],
							},
						},
					),
				},
			],
		};
	}

	private createDeveloperDefinition(): SettingDefinitionGroup {
		return {
			type: 'group',
			heading: 'Developer',
			items: [
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
			],
		};
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

	private createFinalPreviewSettingsDefinition(): SettingDefinitionGroup {
		const settings = this.plugin.settings.finalPreviewSettings;
		return {
			type: 'group',
			heading: 'Final preview settings',
			items: [
				{
					name: 'Default final preview mode',
					desc: 'Preview mode used when opening the editor.',
					render: (setting: Setting) => {
						setting.addDropdown((dropdown) => {
							dropdown
								.addOption('render', 'Render')
								.addOption('html', 'HTML')
								.setValue(settings.defaultMode)
								.onChange(async (value) => {
									settings.defaultMode =
										value === 'html' ? 'html' : 'render';
									await this.plugin.saveSettings();
								});
						});
					},
				},
				{
					name: 'Added highlight color',
					desc: 'Background color for newly added HTML.',
					render: (setting: Setting) => {
						setting.addColorPicker((picker) => {
							picker
								.setValue(settings.addedHighlightColor)
								.onChange(async (value) => {
									settings.addedHighlightColor = value;
									await this.plugin.saveSettings();
								});
						});
					},
				},
				{
					name: 'Changed highlight color',
					desc: 'Background color for modified HTML.',
					render: (setting: Setting) => {
						setting.addColorPicker((picker) => {
							picker
								.setValue(settings.changedHighlightColor)
								.onChange(async (value) => {
									settings.changedHighlightColor = value;
									await this.plugin.saveSettings();
								});
						});
					},
				},
				{
					name: 'Deleted highlight color',
					desc: 'Background color for removed HTML.',
					render: (setting: Setting) => {
						setting.addColorPicker((picker) => {
							picker
								.setValue(settings.deletedHighlightColor)
								.onChange(async (value) => {
									settings.deletedHighlightColor = value;
									await this.plugin.saveSettings();
								});
						});
					},
				},
				{
					name: 'Highlight duration',
					desc: 'Seconds to show HTML changes. Set to 0 to keep them visible.',
					render: (setting: Setting) => {
						setting.addSlider((slider) => {
							slider
								.setLimits(0, 30, 0.5)
								.setValue(settings.highlightDuration)
								.setDisplayFormat((value) =>
									value === 0 ? 'Always' : `${value}s`,
								)
								.setInstant(true)
								.onChange(async (value) => {
									settings.highlightDuration = value;
									await this.plugin.saveSettings();
								});
						});
					},
				},
			],
		};
	}

	private createFastGroupDefinition(): SettingDefinitionList {
		const presets = this.plugin.settings.fastGroupPresets;

		return {
			type: 'list',
			heading: 'Fast group button presets',
			emptyState: 'No fast group button presets.',
			extraButtons: [
				(button) => {
					button
						.setIcon('pencil')
						.setTooltip('Edit presets as JSON')
						.onClick(() => this.openEditFastGroupPresetsModal(presets));
				},
				(button) => {
					button
						.setIcon('trash')
						.setTooltip('Delete all presets')
						.onClick(() => this.confirmDeleteAllFastGroupPresets(presets));
				},
			],
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
				desc: this.createFastGroupPresetDesc(preset),
				page: () => new FastGroupPresetPage(preset, this.plugin),
			})),
		};
	}

	private createFastGroupPresetDesc(preset: FastGroupPreset) {
		const fragment = createFragment();
		const wrapper = fragment.createSpan({ cls: 'ba-fast-group-entry' });
		createFastGroupButtonPreview(wrapper, preset);
		return fragment;
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

	private openEditFastGroupPresetsModal(presets: FastGroupPreset[]) {
		new EditFastGroupPresetsModal(
			this.app,
			serializeFastGroupPresets(presets),
			(json) => {
				const parsed = parseFastGroupPresets(json);
				if (!parsed) {
					new Notice('Invalid preset JSON.');
					return false;
				}

				presets.splice(0, presets.length, ...parsed);
				void this.plugin.saveSettings().then(() => {
					this.update();
					new Notice(`Saved ${parsed.length} preset(s).`);
				});
				return true;
			},
		).open();
	}

	private confirmDeleteAllFastGroupPresets(presets: FastGroupPreset[]) {
		if (presets.length === 0) {
			new Notice('No presets to delete.');
			return;
		}

		new ConfirmModal(
			this.app,
			`Delete all ${presets.length} preset(s)? This cannot be undone.`,
			'Delete all',
			() => {
				void this.deleteAllFastGroupPresets(presets);
			},
		).open();
	}

	private async deleteAllFastGroupPresets(presets: FastGroupPreset[]) {
		presets.splice(0, presets.length);
		await this.plugin.saveSettings();
		this.update();
	}

}

class FastGroupPresetPage extends SettingPage {
	constructor(
		private readonly preset: FastGroupPreset,
		private readonly plugin: SettingsPlugin,
	) {
		super();
		this.title = preset.title || 'Untitled preset';
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.addClass('ba-fast-group-preset-page');

		const previewEl = this.containerEl.createDiv('ba-fast-group-preview');
		const refreshPreview = () => {
			previewEl.empty();
			previewEl.createDiv({
				cls: 'ba-annotate-settings-heading',
				text: 'Preview',
			});
			const buttonRow = previewEl.createDiv(
				'ba-fast-group-preview-button',
			);
			createFastGroupButtonPreview(buttonRow, this.preset);
			const sampleEl = previewEl.createDiv(
				'ba-fast-group-preview-sample',
			);
			appendAnnotatedText(sampleEl, PREVIEW_SAMPLE_TEXT, [
				{
					start: PREVIEW_SAMPLE_GROUP_START,
					end: PREVIEW_SAMPLE_GROUP_END,
					appearance: this.preset.appearance,
				},
			]);
		};
		const onChange = async () => {
			refreshPreview();
			await this.plugin.saveSettings();
		};
		refreshPreview();

		const contentEl = this.containerEl.createDiv(
			'ba-fast-group-preset-page-content',
		);
		contentEl.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Button',
		});
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Button text shown beside segments.')
			.addText((input) => {
				input.setValue(this.preset.title).onChange(async (value) => {
					this.preset.title = value;
					await onChange();
				});
			});
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Optional tooltip for the preset button.')
			.addText((input) => {
				input
					.setValue(this.preset.description)
					.onChange(async (value) => {
						this.preset.description = value;
						await onChange();
					});
			});
		new Setting(contentEl)
			.setName('Button color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(this.preset.buttonColor)
					.onChange(async (value) => {
						this.preset.buttonColor = value;
						await onChange();
					});
			});
		new Setting(contentEl)
			.setName('Button text color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(this.preset.buttonTextColor)
					.onChange(async (value) => {
						this.preset.buttonTextColor = value;
						await onChange();
					});
			});
		new Setting(contentEl)
			.setName('Icon')
			.setDesc('Lucide icon name (e.g. "star"). Leave empty for no icon.')
			.addText((input) => {
				input
					.setValue(this.preset.icon ?? '')
					.onChange(async (value) => {
						this.preset.icon = value.trim();
						await onChange();
					});
			});
		renderTextGroupAppearanceSettings(contentEl, this.preset.appearance, {
			onChange,
		});
	}
}

const PREVIEW_SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog.';
const PREVIEW_SAMPLE_GROUP_START = 4;
const PREVIEW_SAMPLE_GROUP_END = 19;

function createFastGroupButtonPreview(
	container: HTMLElement,
	preset: FastGroupPreset,
) {
	const button = container.createEl('button', {
		cls: 'ba-annotate-fast-group-button ba-fast-group-chip',
	});
	button.type = 'button';
	if (preset.icon.trim()) {
		setIcon(button, preset.icon.trim());
		button.createSpan({ text: preset.title.trim() || 'Preset' });
	} else {
		button.setText(preset.title.trim() || 'Preset');
	}
	button.setCssProps({
		'--ba-fast-group-button-color': preset.buttonColor,
		'--ba-fast-group-button-text-color': preset.buttonTextColor,
	});
	return button;
}
