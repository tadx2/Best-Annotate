import {
	ExtraButtonComponent,
	Setting,
	SettingDefinitionGroup,
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

interface AppearanceSettingsContext {
	onChange: () => void | Promise<void>;
	registerRefresher: (refresh: () => void) => void;
	refreshAll: () => void;
}

interface AppearanceSettingSpec {
	section: AppearanceSection;
	name: string;
	render: (
		setting: Setting,
		appearance: TextGroupAppearance,
		ctx: AppearanceSettingsContext,
	) => void;
}

const APPEARANCE_SETTING_SPECS: AppearanceSettingSpec[] = [
	{
		section: 'Text',
		name: 'Text color',
		render: (setting, appearance, ctx) => {
			renderColorOverride(
				setting,
				appearance,
				'textColor',
				DEFAULT_GROUP_COLOR,
				ctx,
			);
		},
	},
	{
		section: 'Text',
		name: 'Text background',
		render: (setting, appearance, ctx) => {
			renderColorOverride(
				setting,
				appearance,
				'textBackgroundColor',
				DEFAULT_GROUP_COLOR,
				ctx,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Show underline',
		render: (setting, appearance, ctx) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'underline',
				true,
				ctx,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Underline color',
		render: (setting, appearance, ctx) => {
			renderColorOverride(
				setting,
				appearance,
				'underlineColor',
				DEFAULT_GROUP_COLOR,
				ctx,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Underline thickness',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'underlineThickness',
				DEFAULT_UNDERLINE_THICKNESS,
				0.5,
				8,
				0.5,
				(value) => `${value}px`,
				ctx,
			);
		},
	},
	{
		section: 'Underline',
		name: 'Distance from text',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'underlineOffset',
				DEFAULT_UNDERLINE_OFFSET,
				0,
				12,
				1,
				(value) => `${value}px`,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate text',
		render: (setting, appearance, ctx) => {
			renderTextOverride(
				setting,
				appearance,
				'Enter annotate text',
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate color',
		render: (setting, appearance, ctx) => {
			renderColorOverride(
				setting,
				appearance,
				'annotateColor',
				DEFAULT_GROUP_COLOR,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate size',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateFontSize',
				DEFAULT_ANNOTATE_FONT_SIZE,
				0.3,
				2,
				0.05,
				(value) => `${Math.round(value * 100)}%`,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Horizontal position',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateOffsetX',
				DEFAULT_ANNOTATE_OFFSET_X,
				-20,
				20,
				1,
				(value) => `${value}px`,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Vertical position',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateOffsetY',
				DEFAULT_ANNOTATE_OFFSET_Y,
				-20,
				20,
				1,
				(value) => `${value}px`,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Annotate spacing',
		render: (setting, appearance, ctx) => {
			renderNumberOverride(
				setting,
				appearance,
				'annotateSpacing',
				DEFAULT_ANNOTATE_SPACING,
				0,
				20,
				1,
				(value) => `${value}px`,
				ctx,
			);
		},
	},
	{
		section: 'Annotate',
		name: 'Hide annotate',
		render: (setting, appearance, ctx) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'annotateVisible',
				false,
				ctx,
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
		render: (setting, appearance, ctx) => {
			renderBooleanPropertyToggle(
				setting,
				appearance,
				'annotateCompact',
				true,
				ctx,
			);
		},
	},
];

const UNDERLINE_VISUAL_KEYS: ReadonlySet<string> = new Set([
	'underlineColor',
	'underlineThickness',
	'underlineOffset',
]);

function autoShowUnderline(
	appearance: TextGroupAppearance,
	key: ColorKey | NumberKey,
) {
	if (UNDERLINE_VISUAL_KEYS.has(key) && appearance.underline !== true) {
		appearance.underline = true;
	}
}

function renderColorOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	key: ColorKey,
	fallback: string,
	ctx: AppearanceSettingsContext,
) {
	let clearButton: ExtraButtonComponent | null = null;
	setting
		.addColorPicker((component) => {
			component
				.setValue(appearance[key] ?? fallback)
				.onChange((nextValue) => {
					appearance[key] = nextValue;
					autoShowUnderline(appearance, key);
					clearButton?.setDisabled(false);
					ctx.refreshAll();
					return ctx.onChange();
				});
		})
		.addExtraButton((component) => {
			clearButton = component;
			component.extraSettingsEl.addClass('ba-clear-button');
			component
				.setIcon('x')
				.setTooltip('Clear')
				.setDisabled(appearance[key] === null)
				.onClick(() => {
					if (appearance[key] === null) return;
					appearance[key] = null;
					component.setDisabled(true);
					return ctx.onChange();
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
	ctx: AppearanceSettingsContext,
) {
	let clearButton: ExtraButtonComponent | null = null;
	setting
		.addSlider((component) => {
			component
				.setLimits(min, max, step)
				.setValue(appearance[key] ?? fallback)
				.setDisplayFormat(display)
				.setInstant(true)
				.onChange((nextValue) => {
					appearance[key] = nextValue;
					autoShowUnderline(appearance, key);
					clearButton?.setDisabled(false);
					ctx.refreshAll();
					return ctx.onChange();
				});
		})
		.addExtraButton((component) => {
			clearButton = component;
			component.extraSettingsEl.addClass('ba-clear-button');
			component
				.setIcon('x')
				.setTooltip('Clear')
				.setDisabled(appearance[key] === null)
				.onClick(() => {
					if (appearance[key] === null) return;
					appearance[key] = null;
					component.setDisabled(true);
					return ctx.onChange();
				});
		});
}

function renderTextOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	placeholder: string,
	ctx: AppearanceSettingsContext,
) {
	let input: TextComponent | null = null;
	let clearButton: ExtraButtonComponent | null = null;
	setting
		.addText((component) => {
			input = component;
			component
				.setPlaceholder(placeholder)
				.setValue(appearance.annotate ?? '')
				.onChange((nextValue) => {
					appearance.annotate = nextValue.trim() ? nextValue : null;
					clearButton?.setDisabled(appearance.annotate === null);
					return ctx.onChange();
				});
		})
		.addExtraButton((component) => {
			clearButton = component;
			component.extraSettingsEl.addClass('ba-clear-button');
			component
				.setIcon('x')
				.setTooltip('Clear')
				.setDisabled(appearance.annotate === null)
				.onClick(() => {
					if (appearance.annotate === null) return;
					appearance.annotate = null;
					input?.setValue('');
					component.setDisabled(true);
					return ctx.onChange();
				});
		});
}

function renderBooleanPropertyToggle(
	setting: Setting,
	appearance: TextGroupAppearance,
	key: BooleanKey,
	activeValue: boolean,
	ctx: AppearanceSettingsContext,
) {
	setting.addToggle((toggle) => {
		toggle
			.setValue(appearance[key] === activeValue)
			.onChange((active) => {
				appearance[key] = active ? activeValue : null;
				return ctx.onChange();
			});
		ctx.registerRefresher(() => {
			toggle.setValue(appearance[key] === activeValue);
		});
	});
}

function renderPositionOverride(
	setting: Setting,
	appearance: TextGroupAppearance,
	ctx: AppearanceSettingsContext,
) {
	setting.addToggle((toggle) => {
		toggle
			.setValue(appearance.annotatePosition === 'under')
			.onChange((active) => {
				appearance.annotatePosition = active ? 'under' : null;
				return ctx.onChange();
			});
		ctx.registerRefresher(() => {
			toggle.setValue(appearance.annotatePosition === 'under');
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
	const refreshers: Array<() => void> = [];
	const ctx: AppearanceSettingsContext = {
		onChange,
		registerRefresher: (refresh) => refreshers.push(refresh),
		refreshAll: () => {
			for (const refresh of refreshers) refresh();
		},
	};
	for (const spec of APPEARANCE_SETTING_SPECS) {
		if (spec.section !== section) continue;
		const setting = new Setting(container).setName(spec.name);
		spec.render(setting, appearance, ctx);
	}
}

export function createTextGroupAppearanceSettingDefinitions(
	appearance: TextGroupAppearance,
	options: TextGroupAppearanceSettingsOptions,
): SettingDefinitionGroup[] {
	return APPEARANCE_SECTIONS.map((section) => {
		const refreshers: Array<() => void> = [];
		const ctx: AppearanceSettingsContext = {
			onChange: options.onChange,
			registerRefresher: (refresh) => refreshers.push(refresh),
			refreshAll: () => {
				for (const refresh of refreshers) refresh();
			},
		};
		return {
			type: 'group',
			heading: section,
			items: APPEARANCE_SETTING_SPECS.filter(
				(spec) => spec.section === section,
			).map((spec) => ({
				name: spec.name,
				render: (setting: Setting) => {
					spec.render(setting, appearance, ctx);
				},
			})),
		};
	});
}
