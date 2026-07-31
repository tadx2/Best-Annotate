/**
 * 将文字拆分成可选择的元素：中文按单字，英文按单词，数字按连续数字，
 * 其他非空白字符（例如标点）各自作为一个元素。
 */
export function segmentText(text: string) {
	return text.match(
		/\p{Script=Han}|[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*|\p{N}+(?:[.,]\p{N}+)*|[^\s]/gu,
	) ?? [];
}
