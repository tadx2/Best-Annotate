import { TextGroupAppearance } from './types';

export const DEFAULT_GROUP_COLOR = '#000000';
export const DEFAULT_UNDERLINE_THICKNESS = 1;
export const DEFAULT_UNDERLINE_OFFSET = 2;

export const DEFAULT_TEXT_GROUP_APPEARANCE: TextGroupAppearance = {
	textColor: DEFAULT_GROUP_COLOR,
	textBackgroundColor: null,
	underline: false,
	underlineColor: DEFAULT_GROUP_COLOR,
	underlineThickness: DEFAULT_UNDERLINE_THICKNESS,
	underlineOffset: DEFAULT_UNDERLINE_OFFSET,
	annotate: '',
	annotateColor: DEFAULT_GROUP_COLOR,
	annotateVisible: true,
	annotatePosition: 'under',
	annotateCompact: true,
};

export function createDefaultTextGroupAppearance(): TextGroupAppearance {
	return { ...DEFAULT_TEXT_GROUP_APPEARANCE };
}

export function cloneTextGroupAppearance(
	appearance: TextGroupAppearance,
): TextGroupAppearance {
	return { ...appearance };
}
