import {
	ColorComponent,
	Setting,
	SettingDefinitionGroup,
} from 'obsidian';
import { DEFAULT_GROUP_COLOR } from '../text-group/defaults';
import { TextGroupAppearance } from '../text-group/types';

export interface TextGroupAppearanceSettingsOptions {
	onChange: () => void | Promise<void>;
}

type AppearanceSection = 'Text' | 'Underline' | 'Annotate';

interface AppearanceSettingSpec {
	section: AppearanceSection;
	name: string;
	render: (
		setting: Setting,
		appearance: TextGroupAppearance,
		onChange: () => void | Promise<void>,
	) => void;
}

const APPEARANCE_SETTING_SPECS: AppearanceSettingSpec[] = [
	{
		section: 'Text',
		name: 'Text color',
		render: (setting, appearance, onChange) => {
			setting.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(appearance.textColor)
					.onChange((value) => {
						appearance.textColor = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Text',
		name: 'Text background',
		render: (setting, appearance, onChange) => {
			let backgroundColorPicker: ColorComponent | null = null;

			setting
				.addColorPicker((colorPicker) => {
					backgroundColorPicker = colorPicker;
					colorPicker
						.setValue(
							appearance.textBackgroundColor ??
								DEFAULT_GROUP_COLOR,
						)
						.onChange((value) => {
							appearance.textBackgroundColor = value;
							return onChange();
						});
				})
				.addExtraButton((button) => {
					button
						.setIcon('x')
						.setTooltip('Clear background')
						.onClick(() => {
							appearance.textBackgroundColor = null;
							backgroundColorPicker?.setValue(
								DEFAULT_GROUP_COLOR,
							);
							return onChange();
						});
				});
		},
	},
	{
		section: 'Underline',
		name: 'Show underline',
		render: (setting, appearance, onChange) => {
			setting.addToggle((toggle) => {
				toggle
					.setValue(appearance.underline)
					.onChange((value) => {
						appearance.underline = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Underline',
		name: 'Underline color',
		render: (setting, appearance, onChange) => {
			setting.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(appearance.underlineColor)
					.onChange((value) => {
						appearance.underlineColor = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate text',
		render: (setting, appearance, onChange) => {
			setting.addText((input) => {
				input
					.setPlaceholder('Enter annotate text')
					.setValue(appearance.annotate)
					.onChange((value) => {
						appearance.annotate = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate color',
		render: (setting, appearance, onChange) => {
			setting.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(appearance.annotateColor)
					.onChange((value) => {
						appearance.annotateColor = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Annotate',
		name: 'Show annotate',
		render: (setting, appearance, onChange) => {
			setting.addToggle((toggle) => {
				toggle
					.setValue(appearance.annotateVisible)
					.onChange((value) => {
						appearance.annotateVisible = value;
						return onChange();
					});
			});
		},
	},
	{
		section: 'Annotate',
		name: 'Display below',
		render: (setting, appearance, onChange) => {
			setting.addToggle((toggle) => {
				toggle
					.setValue(appearance.annotatePosition === 'under')
					.onChange((value) => {
						appearance.annotatePosition = value
							? 'under'
							: 'over';
						return onChange();
					});
			});
		},
	},
	{
		section: 'Annotate',
		name: 'Compact layout',
		render: (setting, appearance, onChange) => {
			setting.addToggle((toggle) => {
				toggle
					.setValue(appearance.annotateCompact)
					.onChange((value) => {
						appearance.annotateCompact = value;
						return onChange();
					});
			});
		},
	},
];

export function renderTextGroupAppearanceSettings(
	container: HTMLElement,
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
) {
	let currentSection: AppearanceSection | null = null;

	for (const spec of APPEARANCE_SETTING_SPECS) {
		if (spec.section !== currentSection) {
			currentSection = spec.section;
			container.createDiv({
				cls: 'ba-annotate-settings-heading',
				text: currentSection,
			});
		}

		const setting = new Setting(container).setName(spec.name);
		spec.render(setting, appearance, options.onChange);
	}
}

export function createTextGroupAppearanceSettingDefinitions(
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
): SettingDefinitionGroup[] {
	const sections: AppearanceSection[] = ['Text', 'Underline', 'Annotate'];

	return sections.map((section) => ({
		type: 'group',
		heading: section,
		items: APPEARANCE_SETTING_SPECS.filter(
			(spec) => spec.section === section,
		).map((spec) => ({
			name: spec.name,
			render: (setting: Setting) => {
				spec.render(setting, appearance, options.onChange);
			},
		})),
	}));
}
