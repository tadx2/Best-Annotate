import {
	ColorComponent,
	Setting,
	SettingDefinitionGroup,
	SliderComponent,
	TextComponent,
} from 'obsidian';
import {
	DEFAULT_ANNOTATE_FONT_SIZE,
	DEFAULT_ANNOTATE_OFFSET_X,
	DEFAULT_ANNOTATE_OFFSET_Y,
	DEFAULT_ANNOTATE_SPACING,
	DEFAULT_GROUP_COLOR,
	DEFAULT_UNDERLINE_OFFSET,
	DEFAULT_UNDERLINE_THICKNESS,
} from '../text-group/defaults';
import { TextGroupAppearance } from '../text-group/types';

export interface TextGroupAppearanceSettingsOptions {
	onChange: () => void | Promise<void>;
	displayMode?: 'sections' | 'tabs';
}

type AppearanceSection = 'Text' | 'Underline' | 'Annotate';
const APPEARANCE_SECTIONS: AppearanceSection[] = [
	'Text',
	'Underline',
	'Annotate',
];
type ColorKey =
	| 'textColor'
	| 'textBackgroundColor'
	| 'underlineColor'
	| 'annotateColor';
type NumberKey =
	| 'underlineThickness'
	| 'underlineOffset'
	| 'annotateFontSize'
	| 'annotateOffsetX'
	| 'annotateOffsetY'
	| 'annotateSpacing';
type BooleanKey =
	| 'underline'
	| 'annotateVisible'
	| 'annotateCompact';

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
			renderColorOverride(
				setting,
				appearance,
				'textColor',
				DEFAULT_GROUP_COLOR,
				onChange,
			);
		},
	},
	{
		section: 'Text',
		name: 'Text background',
		render: (setting, appearance, onChange) => {
			renderColorOverride(
				setting,
				appearance,
				'textBackgroundColor',
				DEFAULT_GROUP_COLOR,
				onChange,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Show underline',
		render: (setting, appearance, onChange) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'underline',
				true,
				onChange,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Underline color',
		render: (setting, appearance, onChange) => {
			renderColorOverride(
				setting,
				appearance,
				'underlineColor',
				DEFAULT_GROUP_COLOR,
				onChange,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Underline thickness',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'underlineThickness',
				DEFAULT_UNDERLINE_THICKNESS,
				0.5,
				8,
				0.5,
				(value) => `${value}px`,
				onChange,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Distance from text',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'underlineOffset',
				DEFAULT_UNDERLINE_OFFSET,
				0,
				12,
				1,
				(value) => `${value}px`,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate text',
		render: (setting, appearance, onChange) => {
			renderTextOverride(
				setting,
				appearance,
				'Enter annotate text',
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate color',
		render: (setting, appearance, onChange) => {
			renderColorOverride(
				setting,
				appearance,
				'annotateColor',
				DEFAULT_GROUP_COLOR,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate size',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateFontSize',
				DEFAULT_ANNOTATE_FONT_SIZE,
				0.3,
				2,
				0.05,
				(value) => `${Math.round(value * 100)}%`,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Horizontal position',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateOffsetX',
				DEFAULT_ANNOTATE_OFFSET_X,
				-20,
				20,
				1,
				(value) => `${value}px`,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Vertical position',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateOffsetY',
				DEFAULT_ANNOTATE_OFFSET_Y,
				-20,
				20,
				1,
				(value) => `${value}px`,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate spacing',
		render: (setting, appearance, onChange) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateSpacing',
				DEFAULT_ANNOTATE_SPACING,
				0,
				20,
				1,
				(value) => `${value}px`,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Hide annotate',
		render: (setting, appearance, onChange) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'annotateVisible',
				false,
				onChange,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Display below',
		render: renderPositionOverride,
	},
	{
		section: 'Annotate',
		name: 'Compact layout',
		render: (setting, appearance, onChange) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'annotateCompact',
				true,
				onChange,
			);
		},
	},
];

function renderColorOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	key: ColorKey,
	fallback: string,
	onChange: () => void | Promise<void>,
) {
	let value = appearance[key] ?? fallback;
	let picker: ColorComponent | null = null;
	let colorInput: HTMLInputElement | null = null;
	const enabled = appearance[key] !== null;
	setting
		.addColorPicker((component) => {
			picker = component;
			component.setValue(value).onChange((nextValue) => {
				value = nextValue;
				if (appearance[key] === null) return;
				appearance[key] = nextValue;
				return onChange();
			});
			colorInput = setting.controlEl.querySelector('input[type="color"]');
			if (colorInput) colorInput.disabled = !enabled;
		})
		.addToggle((toggle) => {
			toggle.setTooltip('Override').setValue(enabled).onChange((active) => {
				if (colorInput) colorInput.disabled = !active;
				value = picker?.getValue() ?? value;
				appearance[key] = active ? value : null;
				return onChange();
			});
		});
}

function renderNumberOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	key: NumberKey,
	fallback: number,
	min: number,
	max: number,
	step: number,
	display: (value: number) => string,
	onChange: () => void | Promise<void>,
) {
	let value = appearance[key] ?? fallback;
	let slider: SliderComponent | null = null;
	const enabled = appearance[key] !== null;
	setting
		.addSlider((component) => {
			slider = component;
			component
				.setLimits(min, max, step)
				.setValue(value)
				.setDisplayFormat(display)
				.setInstant(true)
				.setDisabled(!enabled)
				.onChange((nextValue) => {
					value = nextValue;
					if (appearance[key] === null) return;
					appearance[key] = nextValue;
					return onChange();
				});
		})
		.addToggle((toggle) => {
			toggle.setTooltip('Override').setValue(enabled).onChange((active) => {
				slider?.setDisabled(!active);
				appearance[key] = active ? value : null;
				return onChange();
			});
		});
}

function renderTextOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	placeholder: string,
	onChange: () => void | Promise<void>,
) {
	let value = appearance.annotate ?? '';
	let input: TextComponent | null = null;
	const enabled = appearance.annotate !== null;
	setting
		.addText((component) => {
			input = component;
			component
				.setPlaceholder(placeholder)
				.setValue(value)
				.setDisabled(!enabled)
				.onChange((nextValue) => {
					value = nextValue;
					if (appearance.annotate === null) return;
					appearance.annotate = nextValue;
					return onChange();
				});
		})
		.addToggle((toggle) => {
			toggle.setTooltip('Override').setValue(enabled).onChange((active) => {
				input?.setDisabled(!active);
				appearance.annotate = active ? value : null;
				return onChange();
			});
		});
}

function renderBooleanPropertyToggle(
	setting: Setting,
	appearance: TextGroupAppearance,
	key: BooleanKey,
	activeValue: boolean,
	onChange: () => void | Promise<void>,
) {
	setting.addToggle((toggle) => {
		toggle
			.setValue(appearance[key] === activeValue)
			.onChange((active) => {
				appearance[key] = active ? activeValue : null;
				return onChange();
			});
	});
}

function renderPositionOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	onChange: () => void | Promise<void>,
) {
	setting.addToggle((toggle) => {
		toggle
			.setValue(appearance.annotatePosition === 'under')
			.onChange((active) => {
				appearance.annotatePosition = active ? 'under' : null;
				return onChange();
			});
	});
}

export function renderTextGroupAppearanceSettings(
	container: HTMLElement,
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
) {
	if (options.displayMode === 'tabs') {
		renderAppearanceTabs(container, appearance, options.onChange);
		return;
	}

	for (const section of APPEARANCE_SECTIONS) {
		container.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: section,
		});
		renderAppearanceSection(
			container,
			section,
			appearance,
			options.onChange,
		);
	}
}

function renderAppearanceTabs(
	container: HTMLElement,
	appearance: TextGroupAppearance,
	onChange: () => void | Promise<void>,
) {
	const tabs = container.createDiv(
		'ba-annotate-tabs ba-annotate-group-settings-tabs',
	);
	tabs.setAttribute('role', 'tablist');
	const items = APPEARANCE_SECTIONS.map((section) => {
		const button = tabs.createEl('button', {
			cls: 'ba-annotate-tab',
			text: section,
		});
		button.type = 'button';
		button.setAttribute('role', 'tab');
		const panel = container.createDiv(
			'ba-annotate-group-settings-tab-panel',
		);
		panel.setAttribute('role', 'tabpanel');
		renderAppearanceSection(panel, section, appearance, onChange);
		return { button, panel, section };
	});

	const selectTab = (section: AppearanceSection) => {
		for (const item of items) {
			const selected = item.section === section;
			item.panel.hidden = !selected;
			item.button.toggleClass('is-active', selected);
			item.button.setAttribute('aria-selected', String(selected));
			item.button.tabIndex = selected ? 0 : -1;
		}
	};

	for (const item of items) {
		item.button.addEventListener('click', () => {
			selectTab(item.section);
		});
	}
	tabs.addEventListener('keydown', (event) => {
		const currentIndex = items.findIndex(
			(item) => item.button === event.target,
		);
		if (currentIndex === -1) return;
		let nextIndex: number | null = null;
		if (event.key === 'ArrowRight') {
			nextIndex = (currentIndex + 1) % items.length;
		} else if (event.key === 'ArrowLeft') {
			nextIndex = (currentIndex - 1 + items.length) % items.length;
		}
		if (nextIndex === null) return;
		event.preventDefault();
		const nextItem = items[nextIndex];
		if (!nextItem) return;
		selectTab(nextItem.section);
		nextItem.button.focus();
	});
	selectTab('Text');
}

function renderAppearanceSection(
	container: HTMLElement,
	section: AppearanceSection,
	appearance: TextGroupAppearance,
	onChange: () => void | Promise<void>,
) {
	for (const spec of APPEARANCE_SETTING_SPECS) {
		if (spec.section !== section) continue;
		const setting = new Setting(container).setName(spec.name);
		spec.render(setting, appearance, onChange);
	}
}

export function createTextGroupAppearanceSettingDefinitions(
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
): SettingDefinitionGroup[] {
	return APPEARANCE_SECTIONS.map((section) => ({
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
