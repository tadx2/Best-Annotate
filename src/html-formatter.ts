const DEFAULT_PRINT_WIDTH = 100;
const INDENT = '  ';
const VOID_ELEMENTS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

export function formatHtml(source: string, printWidth = DEFAULT_PRINT_WIDTH) {
	const parsed = new DOMParser().parseFromString(source, 'text/html');
	const root = parsed.body.firstElementChild;
	if (!root) return source;
	return formatElement(root, 0, printWidth);
}

function formatElement(
	element: Element,
	depth: number,
	printWidth: number,
): string {
	const tagName = element.tagName.toLowerCase();
	const openingTag = formatOpeningTag(element, depth, printWidth);
	if (VOID_ELEMENTS.has(tagName)) return openingTag;

	const children = Array.from(element.childNodes);
	if (children.length === 0) return `${openingTag}</${tagName}>`;
	if (children.every((child) => child.nodeType === Node.TEXT_NODE)) {
		return `${openingTag}${children
			.map((child) => escapeText(child.textContent ?? ''))
			.join('')}</${tagName}>`;
	}

	const lines = [openingTag];
	for (const child of children) {
		if (child.nodeType === Node.ELEMENT_NODE) {
			lines.push(
				formatElement(child as Element, depth + 1, printWidth),
			);
		} else if (child.nodeType === Node.TEXT_NODE) {
			const text = child.textContent ?? '';
			if (text.length > 0) {
				lines.push(`${indent(depth + 1)}${escapeText(text)}`);
			}
		}
	}
	lines.push(`${indent(depth)}</${tagName}>`);
	return lines.join('\n');
}

function formatOpeningTag(
	element: Element,
	depth: number,
	printWidth: number,
) {
	const tagName = element.tagName.toLowerCase();
	const prefix = `${indent(depth)}<${tagName}`;
	const attributes = Array.from(element.attributes).map(
		(attribute) =>
			`${attribute.name}="${escapeAttribute(attribute.value)}"`,
	);
	if (attributes.length === 0) return `${prefix}>`;

	const singleLine = `${prefix} ${attributes.join(' ')}>`;
	if (singleLine.length <= printWidth) return singleLine;

	const attributeIndent = indent(depth + 1);
	return [
		prefix,
		...attributes.map((attribute) => `${attributeIndent}${attribute}`),
		`${indent(depth)}>`,
	].join('\n');
}

function indent(depth: number) {
	return INDENT.repeat(depth);
}

function escapeText(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function escapeAttribute(value: string) {
	return escapeText(value).replaceAll('"', '&quot;');
}
