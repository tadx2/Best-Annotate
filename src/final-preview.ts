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

type HtmlDiffToken = {
	kind: 'markup' | 'text';
	syntax: 'punctuation' | 'tag' | 'attribute' | 'value' | 'text' | 'comment';
	value: string;
	leadingWhitespace: string;
};

type HtmlDiffOperation = {
	type: 'equal' | 'added' | 'deleted';
	token: HtmlDiffToken;
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
			appendSyntaxToken(container, operation.token);
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
			appendTokenWhitespace(container, item.token);
			if (item.type === 'deleted') {
				appendHighlightedToken(
					container,
					item.token,
					'deleted',
					settings.deletedHighlightColor,
				);
			} else if (item.type === 'added') {
				appendHighlightedToken(
					container,
					item.token,
					hasDeleted && hasAdded ? 'changed' : 'added',
					hasDeleted && hasAdded
						? settings.changedHighlightColor
						: settings.addedHighlightColor,
				);
			}
		}
	}
}

export function renderHighlightedHtml(
	container: HTMLElement,
	source: string,
) {
	for (const token of tokenizeHtml(source)) {
		appendSyntaxToken(container, token);
	}
}

export function htmlContentsAreEqual(before: string, after: string) {
	const beforeTokens = tokenizeHtml(before);
	const afterTokens = tokenizeHtml(after);
	if (beforeTokens.length !== afterTokens.length) return false;

	return beforeTokens.every((token, index) =>
		tokensAreEqual(token, afterTokens[index]),
	);
}

function appendTokenWhitespace(
	container: HTMLElement,
	token: HtmlDiffToken,
) {
	if (token.leadingWhitespace) {
		container.appendText(token.leadingWhitespace);
	}
}

function appendSyntaxToken(container: HTMLElement, token: HtmlDiffToken) {
	appendTokenWhitespace(container, token);
	if (token.syntax === 'text') {
		container.appendText(token.value);
		return;
	}
	container.createSpan({
		cls: `ba-annotate-html-syntax-${token.syntax}`,
		text: token.value,
	});
}

function appendHighlightedToken(
	container: HTMLElement,
	token: HtmlDiffToken,
	type: 'added' | 'changed' | 'deleted',
	color: string,
) {
	const span = container.createSpan({
		cls: [
			`ba-annotate-html-diff-${type}`,
			`ba-annotate-html-syntax-${token.syntax}`,
		],
		text: token.value,
	});
	span.style.backgroundColor = color;
	span.setAttribute('title', `${type[0]?.toUpperCase() ?? ''}${type.slice(1)}`);
}

function createHtmlDiff(before: string, after: string) {
	const beforeTokens = tokenizeHtml(before);
	const afterTokens = tokenizeHtml(after);
	let prefixLength = 0;
	while (
		prefixLength < beforeTokens.length &&
		prefixLength < afterTokens.length &&
		tokensAreEqual(
			beforeTokens[prefixLength],
			afterTokens[prefixLength],
		)
	) {
		prefixLength += 1;
	}

	let suffixLength = 0;
	while (
		suffixLength < beforeTokens.length - prefixLength &&
		suffixLength < afterTokens.length - prefixLength &&
		tokensAreEqual(
			beforeTokens[beforeTokens.length - suffixLength - 1],
			afterTokens[afterTokens.length - suffixLength - 1],
		)
	) {
		suffixLength += 1;
	}

	const operations = [
		...afterTokens.slice(0, prefixLength).map<HtmlDiffOperation>((token) => ({
			type: 'equal',
			token,
		})),
		...createTokenDiff(
			beforeTokens.slice(prefixLength, beforeTokens.length - suffixLength),
			afterTokens.slice(prefixLength, afterTokens.length - suffixLength),
		),
		...afterTokens.slice(afterTokens.length - suffixLength).map<HtmlDiffOperation>((token) => ({
			type: 'equal',
			token,
		})),
	];

	return operations;
}

function createTokenDiff(
	beforeTokens: HtmlDiffToken[],
	afterTokens: HtmlDiffToken[],
) {
	const matrix = Array.from(
		{ length: beforeTokens.length + 1 },
		() => new Uint32Array(afterTokens.length + 1),
	);

	for (let beforeIndex = 1; beforeIndex <= beforeTokens.length; beforeIndex++) {
		for (let afterIndex = 1; afterIndex <= afterTokens.length; afterIndex++) {
			const row = matrix[beforeIndex];
			const previousRow = matrix[beforeIndex - 1];
			if (!row || !previousRow) continue;
			if (
				tokensAreEqual(
					beforeTokens[beforeIndex - 1],
					afterTokens[afterIndex - 1],
				)
			) {
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
			tokensAreEqual(
				beforeTokens[beforeIndex - 1],
				afterTokens[afterIndex - 1],
			)
		) {
			operations.push({
				type: 'equal',
				// Keep the latest source formatting when the semantic token is
				// unchanged. Whitespace itself is not a diff anchor.
				token: afterTokens[afterIndex - 1]!,
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
				token: afterTokens[afterIndex - 1]!,
			});
			afterIndex -= 1;
		} else {
			operations.push({
				type: 'deleted',
				token: beforeTokens[beforeIndex - 1]!,
			});
			beforeIndex -= 1;
		}
	}

	return operations.reverse();
}

function tokensAreEqual(
	left: HtmlDiffToken | undefined,
	right: HtmlDiffToken | undefined,
) {
	return (
		left?.kind === right?.kind &&
		left?.syntax === right?.syntax &&
		left?.value === right?.value
	);
}

function getMatrixValue(
	matrix: Uint32Array[],
	row: number,
	column: number,
) {
	return matrix[row]?.[column] ?? 0;
}

function tokenizeHtml(source: string) {
	const tokens: HtmlDiffToken[] = [];
	const chunks = source.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) ?? [];
	let pendingWhitespace = '';

	const appendToken = (
		kind: HtmlDiffToken['kind'],
		syntax: HtmlDiffToken['syntax'],
		value: string,
	) => {
		if (/^\s+$/u.test(value)) {
			pendingWhitespace += value;
			return;
		}
		tokens.push({
			kind,
			syntax,
			value,
			leadingWhitespace: pendingWhitespace,
		});
		pendingWhitespace = '';
	};

	for (const chunk of chunks) {
		if (chunk.startsWith('<!--')) {
			appendToken('markup', 'comment', chunk);
		} else if (chunk.startsWith('<')) {
			const markupTokens =
				chunk.match(/<\/?|\/?>|=|"[^"]*"|'[^']*'|[^\s<>=]+|\s+/g) ?? [];
			let expectsTagName = true;
			for (const token of markupTokens) {
				if (/^\s+$/u.test(token)) {
					appendToken('markup', 'punctuation', token);
				} else if (/^<\/?$/u.test(token) || /^\/?>$/u.test(token)) {
					appendToken('markup', 'punctuation', token);
				} else if (expectsTagName) {
					appendToken('markup', 'tag', token);
					expectsTagName = false;
				} else if (token === '=') {
					appendToken('markup', 'punctuation', token);
				} else if (/^(?:"[^"]*"|'[^']*')$/u.test(token)) {
					appendToken('markup', 'value', token);
				} else {
					appendToken('markup', 'attribute', token);
				}
			}
		} else {
			for (const character of Array.from(chunk)) {
				appendToken('text', 'text', character);
			}
		}
	}

	return tokens;
}
