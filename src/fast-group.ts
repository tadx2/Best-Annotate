import { createDefaultTextGroupAppearance } from './text-group/defaults';
import { TextGroupAppearance } from './text-group/types';

export const DEFAULT_BUTTON_COLOR = '#000000';
export const DEFAULT_BUTTON_TEXT_COLOR = '#ffffff';

export interface FastGroupPreset {
	id: string;
	title: string;
	description: string;
	buttonColor: string;
	buttonTextColor: string;
	appearance: TextGroupAppearance;
}

export function createFastGroupPreset(index: number): FastGroupPreset {
	return {
		id: crypto.randomUUID(),
		title: `Preset ${index}`,
		description: '',
		buttonColor: DEFAULT_BUTTON_COLOR,
		buttonTextColor: DEFAULT_BUTTON_TEXT_COLOR,
		appearance: createDefaultTextGroupAppearance(),
	};
}
