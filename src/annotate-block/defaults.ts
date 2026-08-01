import { AnnotateBlockAppearance } from './types';

export const DEFAULT_ANNOTATE_BLOCK_APPEARANCE: AnnotateBlockAppearance = {
	fontSize: null,
	paragraphMaxWidth: null,
	lineHeight: null,
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
