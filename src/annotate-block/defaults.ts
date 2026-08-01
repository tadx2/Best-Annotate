import { AnnotateBlockAppearance } from './types';

export const DEFAULT_ANNOTATE_BLOCK_APPEARANCE: AnnotateBlockAppearance = {
	fontSize: null,
	textColor: null,
	paragraphMaxWidth: null,
	lineHeight: null,
	paragraphMarginTop: null,
	paragraphMarginRight: null,
	paragraphMarginBottom: null,
	paragraphMarginLeft: null,
	paragraphPaddingTop: null,
	paragraphPaddingRight: null,
	paragraphPaddingBottom: null,
	paragraphPaddingLeft: null,
	borderSize: null,
	borderColor: null,
	textAlignment: null,
	paragraphAlignment: null,
};

export function createDefaultAnnotateBlockAppearance(): AnnotateBlockAppearance {
	return { ...DEFAULT_ANNOTATE_BLOCK_APPEARANCE };
}

export function cloneAnnotateBlockAppearance(
	appearance: AnnotateBlockAppearance,
): AnnotateBlockAppearance {
	return { ...appearance };
}
