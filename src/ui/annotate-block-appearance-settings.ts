import {
	DropdownComponent,
	Setting,
	SettingDefinitionGroup,
	SliderComponent,
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
	| 'lineHeight';

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
	format: (value: number) => string;
}

const ANNOTATE_BLOCK_APPEARANCE_SETTING_SPECS: AnnotateBlockAppearanceSettingSpec[] = [
	{
		name: 'Text size',
		desc: 'Override the inherited text size.',
		key: 'fontSize',
		initialValue: 16,
		min: 10,
		max: 32,
		step: 1,
		format: (value) => `${value}px`,
	},
	{
		name: 'Paragraph max width',
		desc: 'Override the inherited paragraph maximum width.',
		key: 'paragraphMaxWidth',
		initialValue: 640,
		min: 240,
		max: 1200,
		step: 20,
		format: (value) => `${value}px`,
	},
	{
		name: 'Line height',
		desc: 'Override the inherited line height.',
		key: 'lineHeight',
		initialValue: 1.8,
		min: 1,
		max: 3,
		step: 0.1,
		format: (value) => value.toFixed(1),
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

	const textAlignmentSetting = new Setting(container)
		.setName('Text alignment')
		.setDesc('Override the alignment of text inside the paragraph.');
	renderAlignmentSetting(
		textAlignmentSetting,
		appearance,
		'textAlignment',
		options.onChange,
	);

	const paragraphAlignmentSetting = new Setting(container)
		.setName('Paragraph alignment')
		.setDesc('Align the paragraph block when a maximum width is set.');
	refreshAlignmentState = renderAlignmentSetting(
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
		heading: 'Paragraph style for new annotates',
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
			{
				name: 'Text alignment',
				desc: 'Override the alignment of text inside the paragraph.',
				render: (setting: Setting) => {
					renderAlignmentSetting(
						setting,
						appearance,
						'textAlignment',
						options.onChange,
					);
				},
			},
			{
				name: 'Paragraph alignment',
				desc: 'Align the paragraph block when a maximum width is set.',
				render: (setting: Setting) => {
					refreshAlignmentState = renderAlignmentSetting(
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

	setting
		.addToggle((toggle) => {
			toggle.setValue(hasOverride).onChange((enabled) => {
				slider?.setDisabled(!enabled);
				appearance[spec.key] = enabled
					? slider?.getValue() ?? spec.initialValue
					: null;
				if (spec.key === 'paragraphMaxWidth') {
					if (!enabled) appearance.paragraphAlignment = null;
					onMaxWidthChange();
				}
				return onChange();
			});
		})
		.addSlider((component) => {
			slider = component;
			component
				.setLimits(spec.min, spec.max, spec.step)
				.setValue(appearance[spec.key] ?? spec.initialValue)
				.setDisplayFormat(spec.format)
				.setInstant(true)
				.setDisabled(!hasOverride)
				.onChange((value) => {
					if (appearance[spec.key] === null) return;
					appearance[spec.key] = value;
					return onChange();
				});
		});
}

function renderAlignmentSetting(
	setting: Setting,
	appearance: AnnotateBlockAppearance,
	key: AnnotateBlockAlignmentKey,
	onChange: () => void | Promise<void>,
	isAvailable: () => boolean = () => true,
) {
	let toggle: ToggleComponent | null = null;
	let dropdown: DropdownComponent | null = null;

	setting
		.addToggle((component) => {
			toggle = component;
			component
				.setValue(appearance[key] !== null)
				.onChange((enabled) => {
					if (!isAvailable()) return;
					dropdown?.setDisabled(!enabled);
					appearance[key] = enabled
						? parseAlignment(dropdown?.getValue() ?? 'left')
						: null;
					return onChange();
			});
		})
		.addDropdown((component) => {
			dropdown = component;
			component
				.addOption('left', 'Left')
				.addOption('center', 'Center')
				.addOption('right', 'Right')
				.setValue(appearance[key] ?? 'left')
				.setDisabled(appearance[key] === null || !isAvailable())
				.onChange((value) => {
					if (appearance[key] === null || !isAvailable()) return;
					appearance[key] = parseAlignment(value);
					return onChange();
				});
		});

	return () => {
		const available = isAvailable();
		const hasAlignment = appearance[key] !== null;
		setting.settingEl.toggleClass(
			'ba-annotate-setting-disabled',
			!available,
		);
		toggle?.setDisabled(!available).setValue(hasAlignment);
		dropdown?.setDisabled(!available || !hasAlignment);
	};
}

function parseAlignment(value: string): AnnotateBlockAlignment {
	if (value === 'center' || value === 'right') return value;
	return 'left';
}
