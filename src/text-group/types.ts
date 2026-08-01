export interface TextGroupAppearance {
	textColor: string;
	textBackgroundColor: string | null;
	underline: boolean;
	underlineColor: string;
	underlineThickness: number;
	underlineOffset: number;
	annotate: string;
	annotateColor: string;
	annotateVisible: boolean;
	annotatePosition: 'over' | 'under';
	annotateCompact: boolean;
}

export interface TextGroup {
	start: number;
	end: number;
	appearance: TextGroupAppearance;
}
