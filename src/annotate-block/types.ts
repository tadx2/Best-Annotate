export type AnnotateBlockAlignment = 'left' | 'center' | 'right';

export interface AnnotateBlockAppearance {
	fontSize: number | null;
	paragraphMaxWidth: number | null;
	lineHeight: number | null;
	textAlignment: AnnotateBlockAlignment | null;
	paragraphAlignment: AnnotateBlockAlignment | null;
}
