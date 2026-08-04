import { createDefaultTextGroupAppearance } from './text-group/defaults';
import { TextGroupAppearance } from './text-group/types';

export const DEFAULT_BUTTON_COLOR = '#000000';
export const DEFAULT_BUTTON_TEXT_COLOR = '#ffffff';

export interface FastGroupPreset {
	id: string;
	title: string;
	description: string;
	/** Lucide icon name shown on the button. Empty string for no icon. */
	icon: string;
	buttonColor: string;
	buttonTextColor: string;
	appearance: TextGroupAppearance;
}

export function createFastGroupPreset(index: number): FastGroupPreset {
	return {
		id: crypto.randomUUID(),
		title: `Preset ${index}`,
		description: '',
		icon: '',
		buttonColor: DEFAULT_BUTTON_COLOR,
		buttonTextColor: DEFAULT_BUTTON_TEXT_COLOR,
		appearance: createDefaultTextGroupAppearance(),
	};
}

export function serializeFastGroupPresets(presets: FastGroupPreset[]) {
	return JSON.stringify(presets, null, 2);
}

export function parseFastGroupPresets(json: string): FastGroupPreset[] | null {
	let data: unknown;
	try {
		data = JSON.parse(json);
	} catch {
		return null;
	}
	if (!Array.isArray(data)) return null;

	const presets: FastGroupPreset[] = [];
	for (const item of data) {
		if (!item || typeof item !== 'object') return null;
		const candidate = item as Partial<FastGroupPreset>;
		if (typeof candidate.title !== 'string') return null;
		presets.push({
			// Regenerate ids so importing the same file twice never collides.
			id: crypto.randomUUID(),
			title: candidate.title,
			description:
				typeof candidate.description === 'string'
					? candidate.description
					: '',
			icon: typeof candidate.icon === 'string' ? candidate.icon : '',
			buttonColor:
				typeof candidate.buttonColor === 'string'
					? candidate.buttonColor
					: DEFAULT_BUTTON_COLOR,
			buttonTextColor:
				typeof candidate.buttonTextColor === 'string'
					? candidate.buttonTextColor
					: DEFAULT_BUTTON_TEXT_COLOR,
			appearance: {
				...createDefaultTextGroupAppearance(),
				...candidate.appearance,
			},
		});
	}
	return presets;
}
