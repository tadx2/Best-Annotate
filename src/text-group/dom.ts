import {
	AnnotateBlockAlignment,
	AnnotateBlockAppearance,
} from '../annotate-block/types';
import { segmentText } from '../text-segmentation';
import { TextGroup, TextGroupAppearance } from './types';

export const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';

const BLOCK_FONT_SIZE_ATTRIBUTE = 'data-ba-block-font-size';
const BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE =
	'data-ba-block-paragraph-max-width';
const BLOCK_LINE_HEIGHT_ATTRIBUTE = 'data-ba-block-line-height';
const BLOCK_TEXT_ALIGNMENT_ATTRIBUTE = 'data-ba-block-text-alignment';
const BLOCK_PARAGRAPH_ALIGNMENT_ATTRIBUTE =
	'data-ba-block-paragraph-alignment';

const TEXT_COLOR_ATTRIBUTE = 'data-ba-text-color';
const TEXT_BACKGROUND_COLOR_ATTRIBUTE = 'data-ba-text-background-color';
const UNDERLINE_ATTRIBUTE = 'data-ba-underline';
const UNDERLINE_COLOR_ATTRIBUTE = 'data-ba-underline-color';
const UNDERLINE_THICKNESS_ATTRIBUTE = 'data-ba-underline-thickness';
const UNDERLINE_OFFSET_ATTRIBUTE = 'data-ba-underline-offset';
const ANNOTATE_COLOR_ATTRIBUTE = 'data-ba-annotate-color';
const ANNOTATE_FONT_SIZE_ATTRIBUTE = 'data-ba-annotate-font-size';
const ANNOTATE_OFFSET_X_ATTRIBUTE = 'data-ba-annotate-offset-x';
const ANNOTATE_OFFSET_Y_ATTRIBUTE = 'data-ba-annotate-offset-y';
const ANNOTATE_SPACING_ATTRIBUTE = 'data-ba-annotate-spacing';
const ANNOTATE_VISIBLE_ATTRIBUTE = 'data-ba-annotate-visible';
const ANNOTATE_POSITION_ATTRIBUTE = 'data-ba-annotate-position';
const ANNOTATE_COMPACT_ATTRIBUTE = 'data-ba-annotate-compact';

export interface AnnotateContent {
	text: string;
	textGroups: TextGroup[];
	appearance: AnnotateBlockAppearance;
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
	appearance: AnnotateBlockAppearance,
) {
	const annotate = doc.createElement('div');
	annotate.setAttribute(ANNOTATE_ID_ATTRIBUTE, id);
	applyAnnotateBlockAppearance(annotate, appearance);
	appendAnnotatedText(annotate, text, textGroups);
	return annotate;
}

export function applyAnnotateBlockAppearance(
	element: HTMLElement,
	appearance: AnnotateBlockAppearance,
) {
	const styles: Record<string, string> = {};

	if (appearance.fontSize !== null) {
		element.setAttribute(
			BLOCK_FONT_SIZE_ATTRIBUTE,
			String(appearance.fontSize),
		);
		styles['font-size'] = `${appearance.fontSize}px`;
	}
	if (appearance.paragraphMaxWidth !== null) {
		element.setAttribute(
			BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE,
			String(appearance.paragraphMaxWidth),
		);
		styles.width = '100%';
		styles['max-width'] = `${appearance.paragraphMaxWidth}px`;
		styles['box-sizing'] = 'border-box';
	}
	if (appearance.lineHeight !== null) {
		element.setAttribute(
			BLOCK_LINE_HEIGHT_ATTRIBUTE,
			String(appearance.lineHeight),
		);
		styles['line-height'] = String(appearance.lineHeight);
	}
	if (appearance.textAlignment !== null) {
		element.setAttribute(
			BLOCK_TEXT_ALIGNMENT_ATTRIBUTE,
			appearance.textAlignment,
		);
		styles['text-align'] = appearance.textAlignment;
	}
	if (appearance.paragraphAlignment !== null) {
		element.setAttribute(
			BLOCK_PARAGRAPH_ALIGNMENT_ATTRIBUTE,
			appearance.paragraphAlignment,
		);
		styles['margin-left'] =
			appearance.paragraphAlignment === 'left' ? '0' : 'auto';
		styles['margin-right'] =
			appearance.paragraphAlignment === 'right' ? '0' : 'auto';
	}

	if (Object.keys(styles).length > 0) {
		setInlineStyles(element, styles);
	}
}

export function createTextGroupElement(
	doc: Document,
	group: TextGroup,
	text: string,
) {
	const { appearance } = group;
	const container = doc.createElement('span');
	container.classList.add('ba-text-group');
	setInlineStyles(container, {
		'--ba-text-color': appearance.textColor,
		'--ba-text-background-color':
			appearance.textBackgroundColor ?? 'transparent',
		'--ba-underline-color': appearance.underlineColor,
		'--ba-underline-thickness': `${appearance.underlineThickness}px`,
		'--ba-underline-offset': `${appearance.underlineOffset}px`,
		'--ba-annotate-color': appearance.annotateColor,
		'--ba-annotate-font-size': `${appearance.annotateFontSize}em`,
		'--ba-annotate-offset-x': `${appearance.annotateOffsetX}px`,
		'--ba-annotate-offset-y': `${appearance.annotateOffsetY}px`,
		'--ba-annotate-spacing': `${appearance.annotateSpacing}px`,
	});
	writeAppearanceAttributes(container, appearance);

	if (appearance.annotate) {
		const firstSegment = segmentText(text)[0];
		const anchorEnd = firstSegment?.end ?? text.length;
		const ruby = doc.createElement('ruby');
		ruby.classList.add('ba-text-group-annotation');
		setInlineStyles(ruby, {
			'ruby-position': appearance.annotatePosition,
			'ruby-align': appearance.annotateCompact
				? 'center'
				: 'space-around',
		});
		ruby.appendChild(
			createTextGroupBaseElement(
				doc,
				appearance,
				text.slice(0, anchorEnd),
			),
		);

		const annotate = doc.createElement('rt');
		const annotateCssProps: Record<string, string> = {
			color: appearance.annotateColor,
			'font-size': `${appearance.annotateFontSize}em`,
			'white-space': 'nowrap',
			'word-break': 'keep-all',
			'overflow-wrap': 'normal',
			position: 'relative',
			left: `${appearance.annotateOffsetX}px`,
			top: `${appearance.annotateOffsetY}px`,
			'padding-top':
				appearance.annotatePosition === 'under'
					? `${appearance.annotateSpacing}px`
					: '0',
			'padding-bottom':
				appearance.annotatePosition === 'over'
					? `${appearance.annotateSpacing}px`
					: '0',
		};
		if (!appearance.annotateVisible) annotateCssProps.display = 'none';
		if (appearance.annotateCompact) {
			annotateCssProps['line-height'] = '1';
		}
		setInlineStyles(annotate, annotateCssProps);
		appendText(annotate, appearance.annotate);
		ruby.appendChild(annotate);
		container.appendChild(ruby);

		if (anchorEnd < text.length) {
			container.appendChild(
				createTextGroupBaseElement(
					doc,
					appearance,
					text.slice(anchorEnd),
				),
			);
		}
	} else {
		container.appendChild(
			createTextGroupBaseElement(doc, appearance, text),
		);
	}

	return container;
}

function createTextGroupBaseElement(
	doc: Document,
	appearance: TextGroupAppearance,
	text: string,
) {
	const base = doc.createElement('span');
	base.classList.add('ba-text-group-base');
	setInlineStyles(base, {
		color: appearance.textColor,
		'background-color':
			appearance.textBackgroundColor ?? 'transparent',
	});

	if (!appearance.underline) {
		appendText(base, text);
		return base;
	}

	const underline = doc.createElement('u');
	setInlineStyles(underline, {
		'text-decoration-color': appearance.underlineColor,
		'text-decoration-thickness': `${appearance.underlineThickness}px`,
		'text-underline-offset': `${appearance.underlineOffset}px`,
	});
	appendText(underline, text);
	base.appendChild(underline);
	return base;
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

		if (element.classList.contains('ba-text-group')) {
			const start = text.length;
			text += readTextGroupBaseText(element);
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
	return {
		text,
		textGroups,
		appearance: readAnnotateBlockAppearance(annotate),
	};
}

function readTextGroupBaseText(element: Element) {
	let text = '';
	const visit = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? '';
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;

		const child = node as Element;
		if (child.tagName === 'RT' || child.tagName === 'RP') return;
		if (child.tagName === 'BR') {
			text += '\n';
			return;
		}
		child.childNodes.forEach(visit);
	};

	element.childNodes.forEach(visit);
	return text;
}

function readAnnotateBlockAppearance(
	annotate: HTMLElement,
): AnnotateBlockAppearance {
	return {
		fontSize: getOptionalNumberAttribute(
			annotate,
			BLOCK_FONT_SIZE_ATTRIBUTE,
		),
		paragraphMaxWidth: getOptionalNumberAttribute(
			annotate,
			BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE,
		),
		lineHeight: getOptionalNumberAttribute(
			annotate,
			BLOCK_LINE_HEIGHT_ATTRIBUTE,
		),
		textAlignment: getOptionalAlignmentAttribute(
			annotate,
			BLOCK_TEXT_ALIGNMENT_ATTRIBUTE,
		),
		paragraphAlignment: getOptionalAlignmentAttribute(
			annotate,
			BLOCK_PARAGRAPH_ALIGNMENT_ATTRIBUTE,
		),
	};
}

function getOptionalAlignmentAttribute(
	element: Element,
	attribute: string,
): AnnotateBlockAlignment | null {
	const value = element.getAttribute(attribute);
	if (value === null) return null;
	if (value === 'left' || value === 'center' || value === 'right') {
		return value;
	}
	throw new Error(`Invalid ${attribute} attribute.`);
}

function writeAppearanceAttributes(
	element: HTMLElement,
	appearance: TextGroupAppearance,
) {
	element.setAttribute(TEXT_COLOR_ATTRIBUTE, appearance.textColor);
	element.setAttribute(
		TEXT_BACKGROUND_COLOR_ATTRIBUTE,
		appearance.textBackgroundColor ?? '',
	);
	element.setAttribute(UNDERLINE_ATTRIBUTE, String(appearance.underline));
	element.setAttribute(UNDERLINE_COLOR_ATTRIBUTE, appearance.underlineColor);
	element.setAttribute(
		UNDERLINE_THICKNESS_ATTRIBUTE,
		String(appearance.underlineThickness),
	);
	element.setAttribute(
		UNDERLINE_OFFSET_ATTRIBUTE,
		String(appearance.underlineOffset),
	);
	element.setAttribute(ANNOTATE_COLOR_ATTRIBUTE, appearance.annotateColor);
	element.setAttribute(
		ANNOTATE_FONT_SIZE_ATTRIBUTE,
		String(appearance.annotateFontSize),
	);
	element.setAttribute(
		ANNOTATE_OFFSET_X_ATTRIBUTE,
		String(appearance.annotateOffsetX),
	);
	element.setAttribute(
		ANNOTATE_OFFSET_Y_ATTRIBUTE,
		String(appearance.annotateOffsetY),
	);
	element.setAttribute(
		ANNOTATE_SPACING_ATTRIBUTE,
		String(appearance.annotateSpacing),
	);
	element.setAttribute(
		ANNOTATE_VISIBLE_ATTRIBUTE,
		String(appearance.annotateVisible),
	);
	element.setAttribute(
		ANNOTATE_POSITION_ATTRIBUTE,
		appearance.annotatePosition,
	);
	element.setAttribute(
		ANNOTATE_COMPACT_ATTRIBUTE,
		String(appearance.annotateCompact),
	);
}

function readAppearance(element: HTMLElement): TextGroupAppearance {
	const annotate = element.querySelector(
		'.ba-text-group-annotation > rt',
	);
	return {
		textColor: getRequiredAttribute(element, TEXT_COLOR_ATTRIBUTE),
		textBackgroundColor:
			element.getAttribute(TEXT_BACKGROUND_COLOR_ATTRIBUTE) || null,
		underline:
			getRequiredAttribute(element, UNDERLINE_ATTRIBUTE) === 'true',
		underlineColor: getRequiredAttribute(element, UNDERLINE_COLOR_ATTRIBUTE),
		underlineThickness: getRequiredNumberAttribute(
			element,
			UNDERLINE_THICKNESS_ATTRIBUTE,
		),
		underlineOffset: getRequiredNumberAttribute(
			element,
			UNDERLINE_OFFSET_ATTRIBUTE,
		),
		annotate: annotate ? readElementText(annotate) : '',
		annotateColor: getRequiredAttribute(element, ANNOTATE_COLOR_ATTRIBUTE),
		annotateFontSize: getRequiredNumberAttribute(
			element,
			ANNOTATE_FONT_SIZE_ATTRIBUTE,
		),
		annotateOffsetX: getRequiredNumberAttribute(
			element,
			ANNOTATE_OFFSET_X_ATTRIBUTE,
		),
		annotateOffsetY: getRequiredNumberAttribute(
			element,
			ANNOTATE_OFFSET_Y_ATTRIBUTE,
		),
		annotateSpacing: getRequiredNumberAttribute(
			element,
			ANNOTATE_SPACING_ATTRIBUTE,
		),
		annotateVisible:
			getRequiredAttribute(element, ANNOTATE_VISIBLE_ATTRIBUTE) ===
			'true',
		annotatePosition:
			getRequiredAttribute(element, ANNOTATE_POSITION_ATTRIBUTE) === 'over'
				? 'over'
				: 'under',
		annotateCompact:
			getRequiredAttribute(element, ANNOTATE_COMPACT_ATTRIBUTE) === 'true',
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

function getRequiredNumberAttribute(element: Element, name: string) {
	const value = Number(getRequiredAttribute(element, name));
	if (!Number.isFinite(value)) {
		throw new Error(`Invalid ${name} attribute.`);
	}
	return value;
}

function getOptionalNumberAttribute(element: Element, name: string) {
	if (!element.hasAttribute(name)) return null;
	return getRequiredNumberAttribute(element, name);
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
