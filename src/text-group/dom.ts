import { TextGroup, TextGroupAppearance } from './types';

export const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';

const TEXT_COLOR_ATTRIBUTE = 'data-ba-text-color';
const TEXT_BACKGROUND_COLOR_ATTRIBUTE = 'data-ba-text-background-color';
const UNDERLINE_ATTRIBUTE = 'data-ba-underline';
const UNDERLINE_COLOR_ATTRIBUTE = 'data-ba-underline-color';
const ANNOTATE_COLOR_ATTRIBUTE = 'data-ba-annotate-color';
const ANNOTATE_VISIBLE_ATTRIBUTE = 'data-ba-annotate-visible';
const ANNOTATE_POSITION_ATTRIBUTE = 'data-ba-annotate-position';
const ANNOTATE_COMPACT_ATTRIBUTE = 'data-ba-annotate-compact';

export interface AnnotateContent {
	text: string;
	textGroups: TextGroup[];
}

export interface AppendAnnotatedTextOptions {
	onTextGroupElement?: (
		element: HTMLElement,
		group: TextGroup,
		index: number,
	) => void;
}

export function createAnnotateElement(
	doc: Document,
	id: string,
	text: string,
	textGroups: TextGroup[],
) {
	const annotate = doc.createElement('div');
	annotate.setAttribute(ANNOTATE_ID_ATTRIBUTE, id);
	appendAnnotatedText(annotate, text, textGroups);
	return annotate;
}

export function createTextGroupElement(
	doc: Document,
	group: TextGroup,
	text: string,
) {
	const { appearance } = group;
	const ruby = doc.createElement('ruby');
	ruby.classList.add('ba-text-group');
	setInlineStyles(ruby, {
		'--ba-text-color': appearance.textColor,
		'--ba-text-background-color':
			appearance.textBackgroundColor ?? 'transparent',
		'--ba-underline-color': appearance.underlineColor,
		'--ba-annotate-color': appearance.annotateColor,
		'ruby-position': appearance.annotatePosition,
		'ruby-align': appearance.annotateCompact ? 'center' : 'space-around',
	});
	writeAppearanceAttributes(ruby, appearance);

	const base = doc.createElement('span');
	base.classList.add('ba-text-group-base');
	setInlineStyles(base, {
		color: appearance.textColor,
		'background-color':
			appearance.textBackgroundColor ?? 'transparent',
	});
	if (appearance.underline) {
		const underline = doc.createElement('u');
		setInlineStyles(underline, {
			'text-decoration-color': appearance.underlineColor,
		});
		appendText(underline, text);
		base.appendChild(underline);
	} else {
		appendText(base, text);
	}
	ruby.appendChild(base);

	if (appearance.annotate) {
		const annotate = doc.createElement('rt');
		const annotateCssProps: Record<string, string> = {
			color: appearance.annotateColor,
		};
		if (!appearance.annotateVisible) annotateCssProps.display = 'none';
		if (appearance.annotateCompact) {
			annotateCssProps['font-size'] = '0.55em';
			annotateCssProps['line-height'] = '1';
		}
		setInlineStyles(annotate, annotateCssProps);
		appendText(annotate, appearance.annotate);
		ruby.appendChild(annotate);
	}

	return ruby;
}

export function appendAnnotatedText(
	container: HTMLElement,
	text: string,
	textGroups: TextGroup[],
	options: AppendAnnotatedTextOptions = {},
) {
	const groups = textGroups
		.map((group, index) => ({ group, index }))
		.filter(
			({ group }) =>
				group.start >= 0 &&
				group.end > group.start &&
				group.end <= text.length,
		)
		.sort((a, b) => a.group.start - b.group.start);
	let cursor = 0;

	for (const { group, index } of groups) {
		if (group.start < cursor) continue;

		appendText(container, text.slice(cursor, group.start));
		const element = createTextGroupElement(
			container.ownerDocument,
			group,
			text.slice(group.start, group.end),
		);
		options.onTextGroupElement?.(element, group, index);
		container.appendChild(element);
		cursor = group.end;
	}

	appendText(container, text.slice(cursor));
}

export function readAnnotateElement(annotate: HTMLElement): AnnotateContent {
	let text = '';
	const textGroups: TextGroup[] = [];

	const visit = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? '';
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;

		const element = node as HTMLElement;
		if (element.tagName === 'BR') {
			text += '\n';
			return;
		}
		if (element.tagName === 'RT' || element.tagName === 'RP') return;

		if (element.tagName === 'RUBY') {
			const start = text.length;
			element.childNodes.forEach(visit);
			if (text.length > start) {
				textGroups.push({
					start,
					end: text.length,
					appearance: readAppearance(element),
				});
			}
			return;
		}

		element.childNodes.forEach(visit);
	};

	annotate.childNodes.forEach(visit);
	return { text, textGroups };
}

function writeAppearanceAttributes(
	ruby: HTMLElement,
	appearance: TextGroupAppearance,
) {
	ruby.setAttribute(TEXT_COLOR_ATTRIBUTE, appearance.textColor);
	ruby.setAttribute(
		TEXT_BACKGROUND_COLOR_ATTRIBUTE,
		appearance.textBackgroundColor ?? '',
	);
	ruby.setAttribute(UNDERLINE_ATTRIBUTE, String(appearance.underline));
	ruby.setAttribute(UNDERLINE_COLOR_ATTRIBUTE, appearance.underlineColor);
	ruby.setAttribute(ANNOTATE_COLOR_ATTRIBUTE, appearance.annotateColor);
	ruby.setAttribute(
		ANNOTATE_VISIBLE_ATTRIBUTE,
		String(appearance.annotateVisible),
	);
	ruby.setAttribute(
		ANNOTATE_POSITION_ATTRIBUTE,
		appearance.annotatePosition,
	);
	ruby.setAttribute(
		ANNOTATE_COMPACT_ATTRIBUTE,
		String(appearance.annotateCompact),
	);
}

function readAppearance(ruby: HTMLElement): TextGroupAppearance {
	const annotate = Array.from(ruby.children).find(
		(child) => child.tagName === 'RT',
	);
	return {
		textColor: getRequiredAttribute(ruby, TEXT_COLOR_ATTRIBUTE),
		textBackgroundColor:
			ruby.getAttribute(TEXT_BACKGROUND_COLOR_ATTRIBUTE) || null,
		underline: getRequiredAttribute(ruby, UNDERLINE_ATTRIBUTE) === 'true',
		underlineColor: getRequiredAttribute(ruby, UNDERLINE_COLOR_ATTRIBUTE),
		annotate: annotate ? readElementText(annotate) : '',
		annotateColor: getRequiredAttribute(ruby, ANNOTATE_COLOR_ATTRIBUTE),
		annotateVisible:
			getRequiredAttribute(ruby, ANNOTATE_VISIBLE_ATTRIBUTE) === 'true',
		annotatePosition:
			getRequiredAttribute(ruby, ANNOTATE_POSITION_ATTRIBUTE) === 'over'
				? 'over'
				: 'under',
		annotateCompact:
			getRequiredAttribute(ruby, ANNOTATE_COMPACT_ATTRIBUTE) === 'true',
	};
}

function appendText(container: HTMLElement, text: string) {
	text.split(/\r?\n/).forEach((line, index) => {
		if (index > 0) {
			container.appendChild(
				container.ownerDocument.createElement('br'),
			);
		}
		container.appendChild(container.ownerDocument.createTextNode(line));
	});
}

function readElementText(element: Element) {
	let text = '';
	element.childNodes.forEach((node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? '';
		} else if (
			node.nodeType === Node.ELEMENT_NODE &&
			(node as Element).tagName === 'BR'
		) {
			text += '\n';
		}
	});
	return text;
}

function getRequiredAttribute(element: Element, name: string) {
	const value = element.getAttribute(name);
	if (value === null) throw new Error(`Missing ${name} attribute.`);
	return value;
}

function setInlineStyles(
	element: HTMLElement,
	styles: Record<string, string>,
) {
	const value = Object.entries(styles)
		.map(([property, propertyValue]) => `${property}: ${propertyValue}`)
		.join('; ');
	element.setAttribute('style', `${value};`);
}
