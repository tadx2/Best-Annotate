export interface TextGroupAppearance {
	textColor: string | null;
	textBackgroundColor: string | null;
	underline: boolean | null;
	underlineColor: string | null;
	underlineThickness: number | null;
	underlineOffset: number | null;
	annotate: string | null;
	annotateColor: string | null;
	annotateFontSize: number | null;
	annotateOffsetX: number | null;
	annotateOffsetY: number | null;
	annotateSpacing: number | null;
	annotateVisible: boolean | null;
	annotatePosition: 'over' | 'under' | null;
	annotateCompact: boolean | null;
}

export interface TextGroup {
	start: number;
	end: number;
	appearance: TextGroupAppearance;
}
