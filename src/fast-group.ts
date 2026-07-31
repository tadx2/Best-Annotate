export const DEFAULT_GROUP_COLOR = '#000000';
export const DEFAULT_BUTTON_TEXT_COLOR = '#ffffff';

export interface FastGroupPreset {
	id: string;
	title: string;
	description: string;
	buttonColor: string;
	buttonTextColor: string;
	textColor: string;
	textBackgroundColor?: string;
	underline: boolean;
	underlineColor: string;
	annotate: string;
	annotateColor: string;
	annotateVisible: boolean;
	annotatePosition: 'over' | 'under';
	annotateCompact: boolean;
}

export function createFastGroupPreset(index: number): FastGroupPreset {
	return {
		id: crypto.randomUUID(),
		title: `Fast group ${index}`,
		description: '',
		buttonColor: DEFAULT_GROUP_COLOR,
		buttonTextColor: DEFAULT_BUTTON_TEXT_COLOR,
		textColor: DEFAULT_GROUP_COLOR,
		textBackgroundColor: undefined,
		underline: false,
		underlineColor: DEFAULT_GROUP_COLOR,
		annotate: '',
		annotateColor: DEFAULT_GROUP_COLOR,
		annotateVisible: true,
		annotatePosition: 'under',
		annotateCompact: true,
	};
}
