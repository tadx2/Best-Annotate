import { ColorComponent, Setting } from 'obsidian';
import { DEFAULT_GROUP_COLOR } from '../text-group/defaults';
import { TextGroupAppearance } from '../text-group/types';

export interface TextGroupAppearanceSettingsOptions {
	onChange: () => void | Promise<void>;
}

export function renderTextGroupAppearanceSettings(
	container: HTMLElement,
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
) {
	let backgroundColorPicker: ColorComponent | null = null;

	container.createDiv({
		cls: 'ba-annotate-settings-heading',
		text: 'Text',
	});
	new Setting(container)
		.setName('Text color')
		.addColorPicker((colorPicker) => {
			colorPicker
				.setValue(appearance.textColor)
				.onChange((value) => {
					appearance.textColor = value;
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Text background')
		.addColorPicker((colorPicker) => {
			backgroundColorPicker = colorPicker;
			colorPicker
				.setValue(
					appearance.textBackgroundColor ?? DEFAULT_GROUP_COLOR,
				)
				.onChange((value) => {
					appearance.textBackgroundColor = value;
					return options.onChange();
				});
		})
		.addExtraButton((button) => {
			button
				.setIcon('x')
				.setTooltip('Clear background')
				.onClick(() => {
					appearance.textBackgroundColor = null;
					backgroundColorPicker?.setValue(DEFAULT_GROUP_COLOR);
					return options.onChange();
				});
		});

	container.createDiv({
		cls: 'ba-annotate-settings-heading',
		text: 'Underline',
	});
	new Setting(container)
		.setName('Show underline')
		.addToggle((toggle) => {
			toggle
				.setValue(appearance.underline)
				.onChange((value) => {
					appearance.underline = value;
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Underline color')
		.addColorPicker((colorPicker) => {
			colorPicker
				.setValue(appearance.underlineColor)
				.onChange((value) => {
					appearance.underlineColor = value;
					return options.onChange();
				});
		});

	container.createDiv({
		cls: 'ba-annotate-settings-heading',
		text: 'Annotate',
	});
	new Setting(container)
		.setName('Annotate text')
		.addText((input) => {
			input
				.setPlaceholder('Enter annotate text')
				.setValue(appearance.annotate)
				.onChange((value) => {
					appearance.annotate = value;
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Annotate color')
		.addColorPicker((colorPicker) => {
			colorPicker
				.setValue(appearance.annotateColor)
				.onChange((value) => {
					appearance.annotateColor = value;
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Show annotate')
		.addToggle((toggle) => {
			toggle
				.setValue(appearance.annotateVisible)
				.onChange((value) => {
					appearance.annotateVisible = value;
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Display below')
		.addToggle((toggle) => {
			toggle
				.setValue(appearance.annotatePosition === 'under')
				.onChange((value) => {
					appearance.annotatePosition = value ? 'under' : 'over';
					return options.onChange();
				});
		});

	new Setting(container)
		.setName('Compact layout')
		.addToggle((toggle) => {
			toggle
				.setValue(appearance.annotateCompact)
				.onChange((value) => {
					appearance.annotateCompact = value;
					return options.onChange();
				});
		});
}
