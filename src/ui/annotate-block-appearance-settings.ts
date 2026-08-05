import {
	ButtonComponent,
	ColorComponent,
	ExtraButtonComponent,
	Setting,
	SettingDefinition,
	SettingDefinitionGroup,
	SliderComponent,
	TextComponent,
} from 'obsidian';
import {
	AnnotateBlockAlignment,
	AnnotateBlockAppearance,
} from '../annotate-block/types';

export interface AnnotateBlockAppearanceSettingsOptions {
	onChange: () => void | Promise<void>;
	sectionContent?: Partial<
		Record<
			AnnotateBlockAppearanceSection,
			(container: HTMLElement) => void
		>
	>;
	sectionItems?: Partial<
		Record<AnnotateBlockAppearanceSection, SettingDefinition[]>
	>;
}

export type AnnotateBlockAppearanceSection =
	| 'Paragraph'
	| 'Text'
	| 'Wrapper'
	| 'Margin'
	| 'Padding'
	| 'Border';

type AnnotateBlockNumberKey =
	| 'fontSize'
	| 'paragraphMaxWidth'
	| 'lineHeight'
	| 'paragraphMarginAll'
	| 'paragraphMarginTop'
	| 'paragraphMarginRight'
	| 'paragraphMarginBottom'
	| 'paragraphMarginLeft'
	| 'paragraphPaddingAll'
	| 'paragraphPaddingTop'
	| 'paragraphPaddingRight'
	| 'paragraphPaddingBottom'
	| 'paragraphPaddingLeft'
	| 'borderSize';

type AnnotateBlockColorKey =
	| 'textColor'
	| 'paragraphBackgroundColor'
	| 'paragraphMarginColor'
	| 'borderColor';

type AnnotateBlockAlignmentKey =
	| 'textAlignment'
	| 'paragraphAlignment';

const MARGIN_SIDE_KEYS = [
	'paragraphMarginTop',
	'paragraphMarginRight',
	'paragraphMarginBottom',
	'paragraphMarginLeft',
] as const;

const PADDING_SIDE_KEYS = [
	'paragraphPaddingTop',
	'paragraphPaddingRight',
	'paragraphPaddingBottom',
	'paragraphPaddingLeft',
] as const;

interface AnnotateBlockAppearanceSettingSpec {
	section: AnnotateBlockAppearanceSection;
	name: string;
	desc: string;
	key: AnnotateBlockNumberKey;
	initialValue: number;
	min: number;
	max: number;
	step: number;
	unit: string;
}

interface AnnotateBlockColorSettingSpec {
	section: AnnotateBlockAppearanceSection;
	name: string;
	desc: string;
	key: AnnotateBlockColorKey;
}

const DEFAULT_ANNOTATE_BLOCK_COLOR = '#000000';
const DEFAULT_PARAGRAPH_BACKGROUND_COLOR = '#ffffff';

const ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS: AnnotateBlockAppearanceSettingSpec[] = [
	{
		section: 'Text',
		name: 'Text size',
		desc: 'Override the inherited text size.',
		key: 'fontSize',
		initialValue: 16,
		min: 8,
		max: 72,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Paragraph',
		name: 'Paragraph max width',
		desc: 'Override the inherited paragraph maximum width.',
		key: 'paragraphMaxWidth',
		initialValue: 640,
		min: 160,
		max: 2000,
		step: 20,
		unit: 'px',
	},
	{
		section: 'Paragraph',
		name: 'Line height',
		desc: 'Override the inherited line height.',
		key: 'lineHeight',
		initialValue: 1.8,
		min: 0.8,
		max: 5,
		step: 0.1,
		unit: '×',
	},
	{
		section: 'Margin',
		name: 'All sides',
		desc: 'Set the same margin on all four sides.',
		key: 'paragraphMarginAll',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Margin',
		name: 'Margin top',
		desc: 'Override the spacing above the paragraph.',
		key: 'paragraphMarginTop',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Margin',
		name: 'Margin right',
		desc: 'Override the spacing to the right of the paragraph.',
		key: 'paragraphMarginRight',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Margin',
		name: 'Margin bottom',
		desc: 'Override the spacing below the paragraph.',
		key: 'paragraphMarginBottom',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Margin',
		name: 'Margin left',
		desc: 'Override the spacing to the left of the paragraph.',
		key: 'paragraphMarginLeft',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Padding',
		name: 'All sides',
		desc: 'Set the same padding on all four sides.',
		key: 'paragraphPaddingAll',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Padding',
		name: 'Padding top',
		desc: 'Override the spacing inside the top of the paragraph.',
		key: 'paragraphPaddingTop',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Padding',
		name: 'Padding right',
		desc: 'Override the spacing inside the right of the paragraph.',
		key: 'paragraphPaddingRight',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Padding',
		name: 'Padding bottom',
		desc: 'Override the spacing inside the bottom of the paragraph.',
		key: 'paragraphPaddingBottom',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Padding',
		name: 'Padding left',
		desc: 'Override the spacing inside the left of the paragraph.',
		key: 'paragraphPaddingLeft',
		initialValue: 8,
		min: 0,
		max: 200,
		step: 1,
		unit: 'px',
	},
	{
		section: 'Border',
		name: 'Border size',
		desc: 'Add a solid border and override its width.',
		key: 'borderSize',
		initialValue: 1,
		min: 0.5,
		max: 20,
		step: 0.5,
		unit: 'px',
	},
];

const ANNOTATE_BLOCK_COLOR_SETTING_SPECS: AnnotateBlockColorSettingSpec[] = [
	{
		section: 'Paragraph',
		name: 'Background color',
		desc: 'Override the inherited paragraph background color.',
		key: 'paragraphBackgroundColor',
	},
	{
		section: 'Wrapper',
		name: 'Wrapper Background (Outer Margin Color)',
		desc: 'Set the wrapper background shown around the paragraph.',
		key: 'paragraphMarginColor',
	},
	{
		section: 'Text',
		name: 'Text color',
		desc: 'Override the inherited paragraph text color.',
		key: 'textColor',
	},
	{
		section: 'Border',
		name: 'Border color',
		desc: 'Override the paragraph border color.',
		key: 'borderColor',
	},
];

const ANNOTATE_BLOCK_APPEARANCE_SECTIONS: AnnotateBlockAppearanceSection[] = [
	'Text',
	'Paragraph',
	'Wrapper',
	'Border',
	'Margin',
	'Padding',
];

export function renderAnnotateBlockAppearanceSettings(
	container: HTMLElement,
	appearance: AnnotateBlockAppearance,
	options: AnnotateBlockAppearanceSettingsOptions,
) {
	let refreshAlignmentState: () => void = () => undefined;
	const numberSettingRefreshers = new Map<
		AnnotateBlockNumberKey,
		() => void
	>();
	const colorSettingRefreshers = new Map<
		AnnotateBlockColorKey,
		() => void
	>();
	const onNumberValueChange = () => {
		for (const refresh of numberSettingRefreshers.values()) refresh();
	};
	const onColorValueChange = () => {
		for (const refresh of colorSettingRefreshers.values()) refresh();
	};
	for (const section of ANNOTATE_BLOCK_APPEARANCE_SECTIONS) {
		const sectionEl = container.createDiv(
			'ba-annotate-block-style-section',
		);
		sectionEl.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: section,
		});
		options.sectionContent?.[section]?.(sectionEl);

		for (const spec of ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS) {
			if (spec.section !== section) continue;
			const setting = new Setting(sectionEl)
				.setName(spec.name)
				.setDesc(spec.desc);
			const refresh = renderNumberSetting(
				setting,
				appearance,
				spec,
				options.onChange,
				() => refreshAlignmentState(),
				onNumberValueChange,
			);
			numberSettingRefreshers.set(spec.key, refresh);
		}
		for (const spec of ANNOTATE_BLOCK_COLOR_SETTING_SPECS) {
			if (spec.section !== section) continue;
			const setting = new Setting(sectionEl)
				.setName(spec.name)
				.setDesc(spec.desc);
			const refresh = renderColorSetting(
				setting,
				appearance,
				spec,
				options.onChange,
				onColorValueChange,
			);
			colorSettingRefreshers.set(spec.key, refresh);
		}

		if (section === 'Text') {
			const textAlignmentSetting = new Setting(sectionEl)
				.setName('Text alignment')
				.setDesc(
					'Override the alignment of text inside the paragraph.',
				);
			renderTextAlignmentSetting(
				textAlignmentSetting,
				appearance,
				options.onChange,
			);
		}
		if (section === 'Paragraph') {
			const paragraphAlignmentSetting = new Setting(sectionEl)
				.setName('Paragraph alignment')
				.setDesc(
					'Align the paragraph inside the wrapper when a maximum width is set.',
				);
			refreshAlignmentState = renderIconAlignmentSetting(
				paragraphAlignmentSetting,
				appearance,
				'paragraphAlignment',
				options.onChange,
				() => appearance.paragraphMaxWidth !== null,
			);
			refreshAlignmentState();
		}
	}
}

export function createAnnotateBlockAppearanceSettingDefinitions(
	appearance: AnnotateBlockAppearance,
	options: AnnotateBlockAppearanceSettingsOptions,
): SettingDefinitionGroup[] {
	let refreshAlignmentState: () => void = () => undefined;
	const numberSettingRefreshers = new Map<
		AnnotateBlockNumberKey,
		() => void
	>();
	const colorSettingRefreshers = new Map<
		AnnotateBlockColorKey,
		() => void
	>();
	const onNumberValueChange = () => {
		for (const refresh of numberSettingRefreshers.values()) refresh();
	};
	const onColorValueChange = () => {
		for (const refresh of colorSettingRefreshers.values()) refresh();
	};

	return ANNOTATE_BLOCK_APPEARANCE_SECTIONS.map((section) => {
		const items: SettingDefinition[] = [
			...(options.sectionItems?.[section] ?? []),
			...ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS.filter(
				(spec) => spec.section === section,
			).map((spec) => ({
				name: spec.name,
				desc: spec.desc,
				render: (setting: Setting) => {
					const refresh = renderNumberSetting(
						setting,
						appearance,
						spec,
						options.onChange,
						() => refreshAlignmentState(),
						onNumberValueChange,
					);
					numberSettingRefreshers.set(spec.key, refresh);
				},
			})),
			...ANNOTATE_BLOCK_COLOR_SETTING_SPECS.filter(
				(spec) => spec.section === section,
			).map((spec) => ({
				name: spec.name,
				desc: spec.desc,
				render: (setting: Setting) => {
					const refresh = renderColorSetting(
						setting,
						appearance,
						spec,
						options.onChange,
						onColorValueChange,
					);
					colorSettingRefreshers.set(spec.key, refresh);
				},
			})),
		];

		if (section === 'Text') {
			items.push({
				name: 'Text alignment',
				desc: 'Override the alignment of text inside the paragraph.',
				render: (setting: Setting) => {
					renderTextAlignmentSetting(
						setting,
						appearance,
						options.onChange,
					);
				},
			});
		}
		if (section === 'Paragraph') {
			items.push({
				name: 'Paragraph alignment',
				desc: 'Align the paragraph inside the wrapper when a maximum width is set.',
				render: (setting: Setting) => {
					refreshAlignmentState = renderIconAlignmentSetting(
						setting,
						appearance,
						'paragraphAlignment',
						options.onChange,
						() => appearance.paragraphMaxWidth !== null,
					);
					refreshAlignmentState();
				},
			});
		}

		return {
			type: 'group',
			heading: section,
			items,
		};
	});
}

function renderNumberSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	spec: AnnotateBlockAppearanceSettingSpec,
	onChange: () => void | Promise<void>,
	onMaxWidthChange: () => void,
	onValueChange: () => void,
) {
	let slider: SliderComponent | null = null;
	let numberInput: TextComponent | null = null;
	let clearButton: ExtraButtonComponent | null = null;

	const applyValue = (value: number | null) => {
		appearance[spec.key] = value;
		if (value !== null) {
			applySpacingOverrideExclusivity(appearance, spec.key);
		}
		if (spec.key === 'paragraphMaxWidth') {
			if (value === null) appearance.paragraphAlignment = null;
			onMaxWidthChange();
		}
		onValueChange();
		void onChange();
	};

	setting.addText((component) => {
		numberInput = component;
		const current = appearance[spec.key];
		if (current !== null) {
			component.setValue(formatNumberValue(current));
		}
		component.setPlaceholder(formatNumberValue(spec.initialValue));
		component.inputEl.type = 'number';
		component.inputEl.step = 'any';
		component.inputEl.addClass('ba-annotate-number-input');
		component.inputEl.addEventListener('change', () => {
			const rawValue = component.getValue().trim();
			if (!rawValue) {
				applyValue(null);
				return;
			}
			const value = Number(rawValue);
			if (!Number.isFinite(value)) {
				const fallback = appearance[spec.key];
				component.setValue(
					fallback === null ? '' : formatNumberValue(fallback),
				);
				return;
			}

			component.setValue(formatNumberValue(value));
			slider?.setValue(value);
			applyValue(value);
		});
	});
	setting.controlEl.createSpan({
		cls: 'ba-annotate-number-unit',
		text: spec.unit,
	});
	setting.addSlider((component) => {
		slider = component;
		component
			.setLimits(spec.min, spec.max, spec.step)
			.setValue(appearance[spec.key] ?? spec.initialValue)
			.setInstant(true)
			.onChange((value) => {
				numberInput?.setValue(formatNumberValue(value));
				applyValue(value);
			});
		component.sliderEl.nextElementSibling?.remove();
	});
	setting.addExtraButton((component) => {
		clearButton = component;
		component.extraSettingsEl.addClass('ba-clear-button');
		component
			.setIcon('x')
			.setTooltip('Clear')
			.onClick(() => {
				if (appearance[spec.key] === null) return;
				applyValue(null);
			});
	});

	const refresh = () => {
		const value = appearance[spec.key];
		if (value !== null) {
			numberInput?.setValue(formatNumberValue(value));
			slider?.setValue(value);
		} else {
			numberInput?.setValue('');
		}
		clearButton?.setDisabled(value === null);
	};
	refresh();
	return refresh;
}

function renderColorSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	spec: AnnotateBlockColorSettingSpec,
	onChange: () => void | Promise<void>,
	onValueChange: () => void,
) {
	let colorPicker: ColorComponent | null = null;
	let clearButton: ExtraButtonComponent | null = null;

	setting
		.addColorPicker((component) => {
			colorPicker = component;
			component
				.setValue(
					appearance[spec.key] ?? DEFAULT_ANNOTATE_BLOCK_COLOR,
				)
				.onChange((value) => {
					if (appearance[spec.key] === null) {
						applyMarginColorBackground(appearance, spec.key);
					}
					appearance[spec.key] = value;
					onValueChange();
					return onChange();
				});
		})
		.addExtraButton((component) => {
			clearButton = component;
		component.extraSettingsEl.addClass('ba-clear-button');
			component
				.setIcon('x')
				.setTooltip('Clear')
				.onClick(() => {
					if (appearance[spec.key] === null) return;
					appearance[spec.key] = null;
					onValueChange();
					return onChange();
				});
		});

	const refresh = () => {
		const value = appearance[spec.key];
		if (value !== null) colorPicker?.setValue(value);
		clearButton?.setDisabled(value === null);
	};
	refresh();
	return refresh;
}

function applyMarginColorBackground(
	appearance: AnnotateBlockAppearance,
	key: AnnotateBlockColorKey,
) {
	if (
		key === 'paragraphMarginColor' &&
		appearance.paragraphBackgroundColor === null
	) {
		appearance.paragraphBackgroundColor =
			DEFAULT_PARAGRAPH_BACKGROUND_COLOR;
	}
}

function formatNumberValue(value: number) {
	return String(Number(value.toFixed(4)));
}

function applySpacingOverrideExclusivity(
	appearance: AnnotateBlockAppearance,
	key: AnnotateBlockNumberKey,
) {
	if (key === 'paragraphMarginAll') {
		clearSpacingSides(appearance, MARGIN_SIDE_KEYS);
	} else if (isSpacingSideKey(key, MARGIN_SIDE_KEYS)) {
		appearance.paragraphMarginAll = null;
	} else if (key === 'paragraphPaddingAll') {
		clearSpacingSides(appearance, PADDING_SIDE_KEYS);
	} else if (isSpacingSideKey(key, PADDING_SIDE_KEYS)) {
		appearance.paragraphPaddingAll = null;
	}
}

function clearSpacingSides(
	appearance: AnnotateBlockAppearance,
	keys: readonly AnnotateBlockNumberKey[],
) {
	for (const key of keys) appearance[key] = null;
}

function isSpacingSideKey(
	key: AnnotateBlockNumberKey,
	keys: readonly AnnotateBlockNumberKey[],
) {
	return keys.includes(key);
}

function renderTextAlignmentSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	onChange: () => void | Promise<void>,
) {
	return renderIconAlignmentSetting(
		setting,
		appearance,
		'textAlignment',
		onChange,
	);
}

function renderIconAlignmentSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	key: AnnotateBlockAlignmentKey,
	onChange: () => void | Promise<void>,
	isAvailable: () => boolean = () => true,
) {
	let selectedAlignment = appearance[key] ?? 'left';
	const buttons = new Map<AnnotateBlockAlignment, ButtonComponent>();
	let clearButton: ExtraButtonComponent | null = null;
	const options: Array<{
		value: AnnotateBlockAlignment;
		icon: string;
		label: string;
	}> = [
		{ value: 'left', icon: 'align-left', label: 'Align left' },
		{ value: 'center', icon: 'align-center', label: 'Align center' },
		{ value: 'right', icon: 'align-right', label: 'Align right' },
	];

	const updateControls = () => {
		const available = isAvailable();
		const enabled = appearance[key] !== null;
		setting.settingEl.toggleClass(
			'ba-annotate-setting-disabled',
			!available,
		);
		clearButton?.setDisabled(!available || !enabled);
		for (const [value, button] of buttons) {
			button.buttonEl.disabled = !available;
			button.buttonEl.toggleClass(
				'is-active',
				enabled && value === selectedAlignment,
			);
			button.buttonEl.setAttribute(
				'aria-pressed',
				String(enabled && value === selectedAlignment),
			);
		}
	};

	for (const option of options) {
		const button = new ButtonComponent(setting.controlEl)
			.setIcon(option.icon)
			.setTooltip(option.label)
			.onClick(() => {
				if (!isAvailable()) return;
				if (appearance[key] === option.value) {
					// Clicking the active option again clears the override.
					appearance[key] = null;
				} else {
					selectedAlignment = option.value;
					appearance[key] = option.value;
				}
				updateControls();
				return onChange();
			});
		button.buttonEl.addClass('ba-annotate-alignment-button');
		buttons.set(option.value, button);
	}

	setting.addExtraButton((component) => {
		clearButton = component;
		component.extraSettingsEl.addClass('ba-clear-button');
		component
			.setIcon('x')
			.setTooltip('Clear')
			.onClick(() => {
				if (!isAvailable() || appearance[key] === null) return;
				appearance[key] = null;
				updateControls();
				return onChange();
			});
	});
	updateControls();
	return updateControls;
}
