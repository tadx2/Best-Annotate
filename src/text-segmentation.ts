export interface TextSegment {
	text: string;
	start: number;
	end: number;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
	granularity: 'grapheme',
});

/**
 * 将文字统一按字素簇（用户感知的单个字符）拆分成可选择的元素：
 * 中文单字、英文字母、数字、标点、emoji 各自作为一个元素，空白不可选。
 */
export function segmentText(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	for (const { segment, index } of graphemeSegmenter.segment(text)) {
		if (/^\s+$/u.test(segment)) continue;
		segments.push({
			text: segment,
			start: index,
			end: index + segment.length,
		});
	}
	return segments;
}
