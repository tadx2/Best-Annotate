export type AnnotateBlockAlignment = 'left' | 'center' | 'right';

export interface AnnotateBlockAppearance {
	fontSize: number | null;
	textColor: string | null;
	paragraphBackgroundColor: string | null;
	paragraphMaxWidth: number | null;
	lineHeight: number | null;
	paragraphMarginAll: number | null;
	paragraphMarginTop: number | null;
	paragraphMarginRight: number | null;
	paragraphMarginBottom: number | null;
	paragraphMarginLeft: number | null;
	paragraphPaddingAll: number | null;
	paragraphPaddingTop: number | null;
	paragraphPaddingRight: number | null;
	paragraphPaddingBottom: number | null;
	paragraphPaddingLeft: number | null;
	borderSize: number | null;
	borderColor: string | null;
	textAlignment: AnnotateBlockAlignment | null;
	paragraphAlignment: AnnotateBlockAlignment | null;
}
