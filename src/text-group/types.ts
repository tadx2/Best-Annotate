export interface TextGroupAppearance {
	textColor: string;
	textBackgroundColor: string | null;
	underline: boolean;
	underlineColor: string;
	underlineThickness: number;
	underlineOffset: number;
	annotate: string;
	annotateColor: string;
	annotateFontSize: number;
	annotateOffsetX: number;
	annotateOffsetY: number;
	annotateVisible: boolean;
	annotatePosition: 'over' | 'under';
	annotateCompact: boolean;
}

export interface TextGroup {
	start: number;
	end: number;
	appearance: TextGroupAppearance;
}
