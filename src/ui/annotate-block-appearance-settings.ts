import {
	ButtonComponent,
	ColorComponent,
	Setting,
	SettingDefinitionGroup,
	SliderComponent,
	TextComponent,
	ToggleComponent,
} from 'obsidian';
import {
	AnnotateBlockAlignment,
	AnnotateBlockAppearance,
} from '../annotate-block/types';

export interface AnnotateBlockAppearanceSettingsOptions {
	onChange: () => void | Promise<void>;
}

type AnnotateBlockNumberKey =
	| 'fontSize'
	| 'paragraphMaxWidth'
	| 'lineHeight'
	| 'paragraphMarginTop'
	| 'paragraphMarginRight'
	| 'paragraphMarginBottom'
	| 'paragraphMarginLeft'
	| 'paragraphPaddingTop'
	| 'paragraphPaddingRight'
	| 'paragraphPaddingBottom'
	| 'paragraphPaddingLeft'
	| 'borderSize';

type AnnotateBlockColorKey = 'textColor' | 'borderColor';

type AnnotateBlockAlignmentKey =
	| 'textAlignment'
	| 'paragraphAlignment';

interface AnnotateBlockAppearanceSettingSpec {
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
	name: string;
	desc: string;
	key: AnnotateBlockColorKey;
}

const DEFAULT_ANNOTATE_BLOCK_COLOR = '#000000';

const ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS: AnnotateBlockAppearanceSettingSpec[] = [
	{
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
		name: 'Text color',
		desc: 'Override the inherited paragraph text color.',
		key: 'textColor',
	},
	{
		name: 'Border color',
		desc: 'Override the paragraph border color.',
		key: 'borderColor',
	},
];

export function renderAnnotateBlockAppearanceSettings(
	container: HTMLElement,
	appearance: AnnotateBlockAppearance,
	options: AnnotateBlockAppearanceSettingsOptions,
) {
	let refreshAlignmentState: () => void = () => undefined;
	for (const spec of ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS) {
		const setting = new Setting(container)
			.setName(spec.name)
			.setDesc(spec.desc);
		renderNumberSetting(
			setting,
			appearance,
			spec,
			options.onChange,
			() => refreshAlignmentState(),
		);
	}
	for (const spec of ANNOTATE_BLOCK_COLOR_SETTING_SPECS) {
		const setting = new Setting(container)
			.setName(spec.name)
			.setDesc(spec.desc);
		renderColorSetting(setting, appearance, spec, options.onChange);
	}

	const textAlignmentSetting = new Setting(container)
		.setName('Text alignment')
		.setDesc('Override the alignment of text inside the paragraph.');
	renderTextAlignmentSetting(
		textAlignmentSetting,
		appearance,
		options.onChange,
	);

	const paragraphAlignmentSetting = new Setting(container)
		.setName('Paragraph alignment')
		.setDesc('Align the paragraph block when a maximum width is set.');
	refreshAlignmentState = renderIconAlignmentSetting(
		paragraphAlignmentSetting,
		appearance,
		'paragraphAlignment',
		options.onChange,
		() => appearance.paragraphMaxWidth !== null,
	);
	refreshAlignmentState();
}

export function createAnnotateBlockAppearanceSettingDefinition(
	appearance: AnnotateBlockAppearance,
	options: AnnotateBlockAppearanceSettingsOptions,
): SettingDefinitionGroup {
	let refreshAlignmentState: () => void = () => undefined;

	return {
		type: 'group',
		heading: 'Paragraph settings for new annotates',
		items: [
			...ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS.map((spec) => ({
				name: spec.name,
				desc: spec.desc,
				render: (setting: Setting) => {
					renderNumberSetting(
						setting,
						appearance,
						spec,
						options.onChange,
						() => refreshAlignmentState(),
					);
				},
			})),
			...ANNOTATE_BLOCK_COLOR_SETTING_SPECS.map((spec) => ({
				name: spec.name,
				desc: spec.desc,
				render: (setting: Setting) => {
					renderColorSetting(
						setting,
						appearance,
						spec,
						options.onChange,
					);
				},
			})),
			{
				name: 'Text alignment',
				desc: 'Override the alignment of text inside the paragraph.',
				render: (setting: Setting) => {
					renderTextAlignmentSetting(
						setting,
						appearance,
						options.onChange,
					);
				},
			},
			{
				name: 'Paragraph alignment',
				desc: 'Align the paragraph block when a maximum width is set.',
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
			},
		],
	};
}

function renderNumberSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	spec: AnnotateBlockAppearanceSettingSpec,
	onChange: () => void | Promise<void>,
	onMaxWidthChange: () => void,
) {
	const hasOverride = appearance[spec.key] !== null;
	let slider: SliderComponent | null = null;
	let numberInput: TextComponent | null = null;

	setting.addText((component) => {
			numberInput = component;
			component.setValue(
				formatNumberValue(appearance[spec.key] ?? spec.initialValue),
			);
			component.inputEl.type = 'number';
			component.inputEl.step = 'any';
			component.inputEl.disabled = !hasOverride;
			component.inputEl.addClass('ba-annotate-number-input');
			component.inputEl.addEventListener('change', () => {
				const value = parseNumberInputValue(component);
				if (value === null) {
					component.setValue(
						formatNumberValue(
							slider?.getValue() ?? spec.initialValue,
						),
					);
					return;
				}

				component.setValue(formatNumberValue(value));
				slider?.setValue(value);
				if (appearance[spec.key] === null) return;
				appearance[spec.key] = value;
				void onChange();
			});
		});
	setting.controlEl.createSpan({
		cls: 'ba-annotate-number-unit',
		text: spec.unit,
	});
	setting
		.addSlider((component) => {
			slider = component;
			component
				.setLimits(spec.min, spec.max, spec.step)
				.setValue(appearance[spec.key] ?? spec.initialValue)
				.setInstant(true)
				.setDisabled(!hasOverride)
				.onChange((value) => {
					if (appearance[spec.key] === null) return;
					appearance[spec.key] = value;
					numberInput?.setValue(formatNumberValue(value));
					return onChange();
				});
			component.sliderEl.nextElementSibling?.remove();
		})
		.addToggle((toggle) => {
			toggle.setValue(hasOverride).onChange((enabled) => {
				slider?.setDisabled(!enabled);
				if (numberInput) numberInput.inputEl.disabled = !enabled;
				appearance[spec.key] = enabled
					? getNumberInputValue(numberInput, spec.initialValue)
					: null;
				if (spec.key === 'paragraphMaxWidth') {
					if (!enabled) appearance.paragraphAlignment = null;
					onMaxWidthChange();
				}
				return onChange();
			});
		});
}

function renderColorSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	spec: AnnotateBlockColorSettingSpec,
	onChange: () => void | Promise<void>,
) {
	const hasOverride = appearance[spec.key] !== null;
	let colorPicker: ColorComponent | null = null;
	let colorInput: HTMLInputElement | null = null;

	setting
		.addColorPicker((component) => {
			colorPicker = component;
			colorInput = setting.controlEl.querySelector(
				'input[type="color"]',
			);
			if (colorInput) colorInput.disabled = !hasOverride;
			component
				.setValue(
					appearance[spec.key] ?? DEFAULT_ANNOTATE_BLOCK_COLOR,
				)
				.onChange((value) => {
					if (appearance[spec.key] === null) return;
					appearance[spec.key] = value;
					return onChange();
				});
		})
		.addToggle((toggle) => {
			toggle.setValue(hasOverride).onChange((enabled) => {
				if (colorInput) colorInput.disabled = !enabled;
				appearance[spec.key] = enabled
					? colorPicker?.getValue() ?? DEFAULT_ANNOTATE_BLOCK_COLOR
					: null;
				return onChange();
			});
		});
}

function formatNumberValue(value: number) {
	return String(Number(value.toFixed(4)));
}

function getNumberInputValue(
	input: TextComponent | null,
	fallback: number,
) {
	return parseNumberInputValue(input) ?? fallback;
}

function parseNumberInputValue(input: TextComponent | null) {
	const rawValue = input?.getValue().trim();
	if (!rawValue) return null;
	const value = Number(rawValue);
	return Number.isFinite(value) ? value : null;
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
	let toggle: ToggleComponent | null = null;
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
		toggle?.setDisabled(!available).setValue(enabled);
		for (const [value, button] of buttons) {
			button.buttonEl.disabled = !available || !enabled;
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
				if (appearance[key] === null || !isAvailable()) return;
				selectedAlignment = option.value;
				appearance[key] = option.value;
				updateControls();
				return onChange();
			});
		button.buttonEl.addClass('ba-annotate-alignment-button');
		buttons.set(option.value, button);
	}

	setting.addToggle((component) => {
		toggle = component;
		component
			.setValue(appearance[key] !== null)
			.onChange((enabled) => {
				if (!isAvailable()) return;
				appearance[key] = enabled ? selectedAlignment : null;
				updateControls();
				return onChange();
			});
	});
	updateControls();
	return updateControls;
}
