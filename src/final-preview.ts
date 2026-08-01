export interface FinalPreviewSettings {
	addedHighlightColor: string;
	changedHighlightColor: string;
	deletedHighlightColor: string;
	highlightDuration: number;
}

export const DEFAULT_FINAL_PREVIEW_SETTINGS: FinalPreviewSettings = {
	addedHighlightColor: '#b7f7c5',
	changedHighlightColor: '#ffe8a3',
	deletedHighlightColor: '#ffc4c4',
	highlightDuration: 3,
};

type HtmlDiffOperation = {
	type: 'equal' | 'added' | 'deleted';
	value: string;
};

export function renderHtmlDiff(
	container: HTMLElement,
	before: string,
	after: string,
	settings: FinalPreviewSettings,
) {
	const operations = createHtmlDiff(before, after);
	let index = 0;
	while (index < operations.length) {
		const operation = operations[index];
		if (!operation) break;
		if (operation.type === 'equal') {
			container.appendText(operation.value);
			index += 1;
			continue;
		}

		const changedOperations: HtmlDiffOperation[] = [];
		while (
			index < operations.length &&
			operations[index]?.type !== 'equal'
		) {
			const changedOperation = operations[index];
			if (changedOperation) changedOperations.push(changedOperation);
			index += 1;
		}
		const hasAdded = changedOperations.some(
			(item) => item.type === 'added',
		);
		const hasDeleted = changedOperations.some(
			(item) => item.type === 'deleted',
		);
		for (const item of changedOperations) {
			if (item.type === 'deleted') {
				appendHighlightedText(
					container,
					item.value,
					'deleted',
					settings.deletedHighlightColor,
				);
			} else if (item.type === 'added') {
				appendHighlightedText(
					container,
					item.value,
					hasDeleted && hasAdded ? 'changed' : 'added',
					hasDeleted && hasAdded
						? settings.changedHighlightColor
						: settings.addedHighlightColor,
				);
			}
		}
	}
}

function appendHighlightedText(
	container: HTMLElement,
	value: string,
	type: 'added' | 'changed' | 'deleted',
	color: string,
) {
	const span = container.createSpan({
		cls: `ba-annotate-html-diff-${type}`,
		text: value,
	});
	span.style.backgroundColor = color;
	span.setAttribute('title', `${type[0]?.toUpperCase() ?? ''}${type.slice(1)}`);
}

function createHtmlDiff(before: string, after: string) {
	const beforeTokens = tokenizeHtml(before);
	const afterTokens = tokenizeHtml(after);
	const matrix = Array.from(
		{ length: beforeTokens.length + 1 },
		() => new Uint32Array(afterTokens.length + 1),
	);

	for (let beforeIndex = 1; beforeIndex <= beforeTokens.length; beforeIndex++) {
		for (let afterIndex = 1; afterIndex <= afterTokens.length; afterIndex++) {
			const row = matrix[beforeIndex];
			const previousRow = matrix[beforeIndex - 1];
			if (!row || !previousRow) continue;
			if (beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]) {
				row[afterIndex] = previousRow[afterIndex - 1]! + 1;
			} else {
				row[afterIndex] = Math.max(
					previousRow[afterIndex]!,
					row[afterIndex - 1]!,
				);
			}
		}
	}

	const operations: HtmlDiffOperation[] = [];
	let beforeIndex = beforeTokens.length;
	let afterIndex = afterTokens.length;
	while (beforeIndex > 0 || afterIndex > 0) {
		if (
			beforeIndex > 0 &&
			afterIndex > 0 &&
			beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]
		) {
			operations.push({
				type: 'equal',
				value: beforeTokens[beforeIndex - 1]!,
			});
			beforeIndex -= 1;
			afterIndex -= 1;
		} else if (
			afterIndex > 0 &&
			(beforeIndex === 0 ||
				getMatrixValue(matrix, beforeIndex, afterIndex - 1) >=
					getMatrixValue(matrix, beforeIndex - 1, afterIndex))
		) {
			operations.push({
				type: 'added',
				value: afterTokens[afterIndex - 1]!,
			});
			afterIndex -= 1;
		} else {
			operations.push({
				type: 'deleted',
				value: beforeTokens[beforeIndex - 1]!,
			});
			beforeIndex -= 1;
		}
	}

	return operations.reverse();
}

function getMatrixValue(
	matrix: Uint32Array[],
	row: number,
	column: number,
) {
	return matrix[row]?.[column] ?? 0;
}

function tokenizeHtml(source: string) {
	return (
		source.match(
			/<!--[\s\S]*?-->|<\/?|\/?>|="[^"]*"|='[^']*'|\s+|[^<>\s=]+|=/g,
		) ?? []
	);
}
