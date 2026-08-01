import { TextGroupAppearance } from './types';

export const DEFAULT_GROUP_COLOR = '#000000';
export const DEFAULT_UNDERLINE_THICKNESS = 1;
export const DEFAULT_UNDERLINE_OFFSET = 2;
export const DEFAULT_ANNOTATE_FONT_SIZE = 0.55;
export const DEFAULT_ANNOTATE_OFFSET_X = 0;
export const DEFAULT_ANNOTATE_OFFSET_Y = 0;
export const DEFAULT_ANNOTATE_SPACING = 0;

export const DEFAULT_TEXT_GROUP_APPEARANCE: TextGroupAppearance = {
	textColor: null,
	textBackgroundColor: null,
	underline: null,
	underlineColor: null,
	underlineThickness: null,
	underlineOffset: null,
	annotate: null,
	annotateColor: null,
	annotateFontSize: null,
	annotateOffsetX: null,
	annotateOffsetY: null,
	annotateSpacing: null,
	annotateVisible: null,
	annotatePosition: null,
	annotateCompact: null,
};

export function createDefaultTextGroupAppearance(): TextGroupAppearance {
	return { ...DEFAULT_TEXT_GROUP_APPEARANCE };
}

export function cloneTextGroupAppearance(
	appearance: TextGroupAppearance,
): TextGroupAppearance {
	return { ...appearance };
}
