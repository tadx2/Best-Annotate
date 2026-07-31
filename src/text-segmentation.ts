export interface TextSegment {
	text: string;
	start: number;
	end: number;
}

export interface TextGroup {
	start: number;
	end: number;
}

const SEGMENT_PATTERN =
	/\p{Script=Han}|[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*|\p{N}+(?:[.,]\p{N}+)*|[^\s]/gu;

/**
 * 将文字拆分成可选择的元素：中文按单字，英文按单词，数字按连续数字，
 * 其他非空白字符（例如标点）各自作为一个元素。
 */
export function segmentText(text: string): TextSegment[] {
	return Array.from(text.matchAll(SEGMENT_PATTERN), (match) => ({
		text: match[0],
		start: match.index,
		end: match.index + match[0].length,
	}));
}
