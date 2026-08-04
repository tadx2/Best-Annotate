import {
	AnnotateBlockAlignment,
	AnnotateBlockAppearance,
} from '../annotate-block/types';
import { TextGroup, TextGroupAppearance } from './types';

export const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';

const BLOCK_FONT_SIZE_ATTRIBUTE = 'data-ba-block-font-size';
const BLOCK_TEXT_COLOR_ATTRIBUTE = 'data-ba-block-text-color';
const BLOCK_BACKGROUND_COLOR_ATTRIBUTE = 'data-ba-block-background-color';
const BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE =
	'data-ba-block-paragraph-max-width';
const BLOCK_LINE_HEIGHT_ATTRIBUTE = 'data-ba-block-line-height';
const BLOCK_MARGIN_COLOR_ATTRIBUTE = 'data-ba-block-margin-color';
const BLOCK_MARGIN_ALL_ATTRIBUTE = 'data-ba-block-margin';
const BLOCK_MARGIN_TOP_ATTRIBUTE = 'data-ba-block-margin-top';
const BLOCK_MARGIN_RIGHT_ATTRIBUTE = 'data-ba-block-margin-right';
const BLOCK_MARGIN_BOTTOM_ATTRIBUTE = 'data-ba-block-margin-bottom';
const BLOCK_MARGIN_LEFT_ATTRIBUTE = 'data-ba-block-margin-left';
const BLOCK_PADDING_ALL_ATTRIBUTE = 'data-ba-block-padding';
const BLOCK_PADDING_TOP_ATTRIBUTE = 'data-ba-block-padding-top';
const BLOCK_PADDING_RIGHT_ATTRIBUTE = 'data-ba-block-padding-right';
const BLOCK_PADDING_BOTTOM_ATTRIBUTE = 'data-ba-block-padding-bottom';
const BLOCK_PADDING_LEFT_ATTRIBUTE = 'data-ba-block-padding-left';
const BLOCK_BORDER_SIZE_ATTRIBUTE = 'data-ba-block-border-size';
const BLOCK_BORDER_COLOR_ATTRIBUTE = 'data-ba-block-border-color';
const BLOCK_TEXT_ALIGNMENT_ATTRIBUTE = 'data-ba-block-text-alignment';
const BLOCK_PARAGRAPH_ALIGNMENT_ATTRIBUTE =
	'data-ba-block-paragraph-alignment';

const TEXT_COLOR_ATTRIBUTE = 'data-ba-text-color';
const TEXT_BACKGROUND_COLOR_ATTRIBUTE = 'data-ba-text-background-color';
const UNDERLINE_ATTRIBUTE = 'data-ba-underline';
const UNDERLINE_COLOR_ATTRIBUTE = 'data-ba-underline-color';
const UNDERLINE_THICKNESS_ATTRIBUTE = 'data-ba-underline-thickness';
const UNDERLINE_OFFSET_ATTRIBUTE = 'data-ba-underline-offset';
const ANNOTATE_TEXT_ATTRIBUTE = 'data-ba-annotate-text';
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
	const content = createAnnotateContentElement(annotate, appearance);
	appendAnnotatedText(content, text, textGroups);
	return annotate;
}

export function createAnnotateContentElement(
	wrapper: HTMLElement,
	appearance: AnnotateBlockAppearance,
) {
	const content = wrapper.ownerDocument.createElement('div');
	wrapper.appendChild(content);
	const wrapperStyles: Record<string, string> = {};
	const contentStyles: Record<string, string> = {};

	if (appearance.fontSize !== null) {
		wrapper.setAttribute(
			BLOCK_FONT_SIZE_ATTRIBUTE,
			String(appearance.fontSize),
		);
		contentStyles['font-size'] = `${appearance.fontSize}px`;
	}
	if (appearance.textColor !== null) {
		wrapper.setAttribute(BLOCK_TEXT_COLOR_ATTRIBUTE, appearance.textColor);
		contentStyles.color = appearance.textColor;
	}
	if (appearance.paragraphBackgroundColor !== null) {
		wrapper.setAttribute(
			BLOCK_BACKGROUND_COLOR_ATTRIBUTE,
			appearance.paragraphBackgroundColor,
		);
		contentStyles['background-color'] =
			appearance.paragraphBackgroundColor;
	}
	if (appearance.paragraphMaxWidth !== null) {
		wrapper.setAttribute(
			BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE,
			String(appearance.paragraphMaxWidth),
		);
		contentStyles.width = '100%';
		contentStyles['max-width'] = `${appearance.paragraphMaxWidth}px`;
		contentStyles['box-sizing'] = 'border-box';
	}
	if (appearance.lineHeight !== null) {
		wrapper.setAttribute(
			BLOCK_LINE_HEIGHT_ATTRIBUTE,
			String(appearance.lineHeight),
		);
		contentStyles['line-height'] = String(appearance.lineHeight);
	}
	if (appearance.paragraphMarginColor !== null) {
		wrapper.setAttribute(
			BLOCK_MARGIN_COLOR_ATTRIBUTE,
			appearance.paragraphMarginColor,
		);
		wrapperStyles['background-color'] = appearance.paragraphMarginColor;
	}
	applyOptionalPixelStyle(
		wrapper,
		wrapperStyles,
		BLOCK_MARGIN_ALL_ATTRIBUTE,
		'padding',
		appearance.paragraphMarginAll,
	);
	applyOptionalPixelStyle(
		wrapper,
		wrapperStyles,
		BLOCK_MARGIN_TOP_ATTRIBUTE,
		'padding-top',
		appearance.paragraphMarginTop,
	);
	applyOptionalPixelStyle(
		wrapper,
		wrapperStyles,
		BLOCK_MARGIN_RIGHT_ATTRIBUTE,
		'padding-right',
		appearance.paragraphMarginRight,
	);
	applyOptionalPixelStyle(
		wrapper,
		wrapperStyles,
		BLOCK_MARGIN_BOTTOM_ATTRIBUTE,
		'padding-bottom',
		appearance.paragraphMarginBottom,
	);
	applyOptionalPixelStyle(
		wrapper,
		wrapperStyles,
		BLOCK_MARGIN_LEFT_ATTRIBUTE,
		'padding-left',
		appearance.paragraphMarginLeft,
	);
	applyOptionalPixelStyle(
		wrapper,
		contentStyles,
		BLOCK_PADDING_ALL_ATTRIBUTE,
		'padding',
		appearance.paragraphPaddingAll,
	);
	applyOptionalPixelStyle(
		wrapper,
		contentStyles,
		BLOCK_PADDING_TOP_ATTRIBUTE,
		'padding-top',
		appearance.paragraphPaddingTop,
	);
	applyOptionalPixelStyle(
		wrapper,
		contentStyles,
		BLOCK_PADDING_RIGHT_ATTRIBUTE,
		'padding-right',
		appearance.paragraphPaddingRight,
	);
	applyOptionalPixelStyle(
		wrapper,
		contentStyles,
		BLOCK_PADDING_BOTTOM_ATTRIBUTE,
		'padding-bottom',
		appearance.paragraphPaddingBottom,
	);
	applyOptionalPixelStyle(
		wrapper,
		contentStyles,
		BLOCK_PADDING_LEFT_ATTRIBUTE,
		'padding-left',
		appearance.paragraphPaddingLeft,
	);
	if (appearance.borderSize !== null) {
		wrapper.setAttribute(
			BLOCK_BORDER_SIZE_ATTRIBUTE,
			String(appearance.borderSize),
		);
		contentStyles['border-style'] = 'solid';
		contentStyles['border-width'] = `${appearance.borderSize}px`;
	}
	if (appearance.borderColor !== null) {
		wrapper.setAttribute(
			BLOCK_BORDER_COLOR_ATTRIBUTE,
			appearance.borderColor,
		);
		contentStyles['border-color'] = appearance.borderColor;
	}
	if (appearance.textAlignment !== null) {
		wrapper.setAttribute(
			BLOCK_TEXT_ALIGNMENT_ATTRIBUTE,
			appearance.textAlignment,
		);
		contentStyles['text-align'] = appearance.textAlignment;
	}
	if (appearance.paragraphAlignment !== null) {
		wrapper.setAttribute(
			BLOCK_PARAGRAPH_ALIGNMENT_ATTRIBUTE,
			appearance.paragraphAlignment,
		);
		contentStyles['margin-left'] =
			appearance.paragraphAlignment === 'left' ? '0' : 'auto';
		contentStyles['margin-right'] =
			appearance.paragraphAlignment === 'right' ? '0' : 'auto';
	}

	if (
		appearance.paragraphPaddingAll !== null ||
		appearance.paragraphPaddingTop !== null ||
		appearance.paragraphPaddingRight !== null ||
		appearance.paragraphPaddingBottom !== null ||
		appearance.paragraphPaddingLeft !== null ||
		appearance.borderSize !== null
	) {
		contentStyles.width = '100%';
		contentStyles['box-sizing'] = 'border-box';
	}
	if (Object.keys(wrapperStyles).length > 0) {
		setInlineStyles(wrapper, wrapperStyles);
	}
	if (Object.keys(contentStyles).length > 0) {
		setInlineStyles(content, contentStyles);
	}
	return content;
}

export function createTextGroupElement(
	doc: Document,
	group: TextGroup,
	text: string,
) {
	const { appearance } = group;
	const container = doc.createElement('span');
	container.classList.add('ba-text-group');
	const containerStyles: Record<string, string> = {};
	addOptionalStyle(containerStyles, '--ba-text-color', appearance.textColor);
	addOptionalStyle(
		containerStyles,
		'--ba-text-background-color',
		appearance.textBackgroundColor,
	);
	addOptionalStyle(
		containerStyles,
		'--ba-underline-color',
		appearance.underlineColor,
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-underline-thickness',
		appearance.underlineThickness,
		'px',
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-underline-offset',
		appearance.underlineOffset,
		'px',
	);
	addOptionalStyle(
		containerStyles,
		'--ba-annotate-color',
		appearance.annotateColor,
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-annotate-font-size',
		appearance.annotateFontSize,
		'em',
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-annotate-offset-x',
		appearance.annotateOffsetX,
		'px',
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-annotate-offset-y',
		appearance.annotateOffsetY,
		'px',
	);
	addOptionalUnitStyle(
		containerStyles,
		'--ba-annotate-spacing',
		appearance.annotateSpacing,
		'px',
	);
	if (Object.keys(containerStyles).length > 0) {
		setInlineStyles(container, containerStyles);
	}
	writeAppearanceAttributes(container, appearance);

	if (appearance.annotate) {
		const ruby = doc.createElement('ruby');
		ruby.classList.add('ba-text-group-annotation');
		const rubyStyles: Record<string, string> = {};
		addOptionalStyle(
			rubyStyles,
			'ruby-position',
			appearance.annotatePosition,
		);
		if (appearance.annotateCompact !== null) {
			rubyStyles['ruby-align'] = appearance.annotateCompact
				? 'center'
				: 'space-around';
		}
		if (Object.keys(rubyStyles).length > 0) {
			setInlineStyles(ruby, rubyStyles);
		}
		ruby.appendChild(createTextGroupBaseElement(doc, appearance, text));

		const annotate = doc.createElement('rt');
		const annotateCssProps: Record<string, string> = {
			'white-space': 'nowrap',
			'word-break': 'keep-all',
			'overflow-wrap': 'normal',
			position: 'relative',
		};
		addOptionalStyle(
			annotateCssProps,
			'color',
			appearance.annotateColor,
		);
		addOptionalUnitStyle(
			annotateCssProps,
			'font-size',
			appearance.annotateFontSize,
			'em',
		);
		addOptionalUnitStyle(
			annotateCssProps,
			'left',
			appearance.annotateOffsetX,
			'px',
		);
		addOptionalUnitStyle(
			annotateCssProps,
			'top',
			appearance.annotateOffsetY,
			'px',
		);
		if (appearance.annotateSpacing !== null) {
			const position = appearance.annotatePosition ?? 'over';
			annotateCssProps[
				position === 'under' ? 'padding-top' : 'padding-bottom'
			] = `${appearance.annotateSpacing}px`;
		}
		if (appearance.annotateVisible === false) {
			annotateCssProps.display = 'none';
		}
		if (appearance.annotateCompact === true) {
			annotateCssProps['line-height'] = '1';
		}
		setInlineStyles(annotate, annotateCssProps);
		appendText(annotate, appearance.annotate);
		ruby.appendChild(annotate);
		container.appendChild(ruby);
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
	const baseStyles: Record<string, string> = {};
	addOptionalStyle(baseStyles, 'color', appearance.textColor);
	addOptionalStyle(
		baseStyles,
		'background-color',
		appearance.textBackgroundColor,
	);
	if (Object.keys(baseStyles).length > 0) {
		setInlineStyles(base, baseStyles);
	}

	if (appearance.underline !== true) {
		appendText(base, text);
		return base;
	}

	const underline = doc.createElement('u');
	const underlineStyles: Record<string, string> = {};
	addOptionalStyle(
		underlineStyles,
		'text-decoration-color',
		appearance.underlineColor,
	);
	addOptionalUnitStyle(
		underlineStyles,
		'text-decoration-thickness',
		appearance.underlineThickness,
		'px',
	);
	addOptionalUnitStyle(
		underlineStyles,
		'text-underline-offset',
		appearance.underlineOffset,
		'px',
	);
	if (Object.keys(underlineStyles).length > 0) {
		setInlineStyles(underline, underlineStyles);
	}
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
		textColor: annotate.getAttribute(BLOCK_TEXT_COLOR_ATTRIBUTE),
		paragraphBackgroundColor: annotate.getAttribute(
			BLOCK_BACKGROUND_COLOR_ATTRIBUTE,
		),
		paragraphMaxWidth: getOptionalNumberAttribute(
			annotate,
			BLOCK_PARAGRAPH_MAX_WIDTH_ATTRIBUTE,
		),
		lineHeight: getOptionalNumberAttribute(
			annotate,
			BLOCK_LINE_HEIGHT_ATTRIBUTE,
		),
		paragraphMarginColor: annotate.getAttribute(
			BLOCK_MARGIN_COLOR_ATTRIBUTE,
		),
		paragraphMarginAll: getOptionalNumberAttribute(
			annotate,
			BLOCK_MARGIN_ALL_ATTRIBUTE,
		),
		paragraphMarginTop: getOptionalNumberAttribute(
			annotate,
			BLOCK_MARGIN_TOP_ATTRIBUTE,
		),
		paragraphMarginRight: getOptionalNumberAttribute(
			annotate,
			BLOCK_MARGIN_RIGHT_ATTRIBUTE,
		),
		paragraphMarginBottom: getOptionalNumberAttribute(
			annotate,
			BLOCK_MARGIN_BOTTOM_ATTRIBUTE,
		),
		paragraphMarginLeft: getOptionalNumberAttribute(
			annotate,
			BLOCK_MARGIN_LEFT_ATTRIBUTE,
		),
		paragraphPaddingAll: getOptionalNumberAttribute(
			annotate,
			BLOCK_PADDING_ALL_ATTRIBUTE,
		),
		paragraphPaddingTop: getOptionalNumberAttribute(
			annotate,
			BLOCK_PADDING_TOP_ATTRIBUTE,
		),
		paragraphPaddingRight: getOptionalNumberAttribute(
			annotate,
			BLOCK_PADDING_RIGHT_ATTRIBUTE,
		),
		paragraphPaddingBottom: getOptionalNumberAttribute(
			annotate,
			BLOCK_PADDING_BOTTOM_ATTRIBUTE,
		),
		paragraphPaddingLeft: getOptionalNumberAttribute(
			annotate,
			BLOCK_PADDING_LEFT_ATTRIBUTE,
		),
		borderSize: getOptionalNumberAttribute(
			annotate,
			BLOCK_BORDER_SIZE_ATTRIBUTE,
		),
		borderColor: annotate.getAttribute(BLOCK_BORDER_COLOR_ATTRIBUTE),
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
	setOptionalAttribute(element, TEXT_COLOR_ATTRIBUTE, appearance.textColor);
	setOptionalAttribute(
		element,
		TEXT_BACKGROUND_COLOR_ATTRIBUTE,
		appearance.textBackgroundColor,
	);
	setOptionalAttribute(element, UNDERLINE_ATTRIBUTE, appearance.underline);
	setOptionalAttribute(
		element,
		UNDERLINE_COLOR_ATTRIBUTE,
		appearance.underlineColor,
	);
	setOptionalAttribute(
		element,
		UNDERLINE_THICKNESS_ATTRIBUTE,
		appearance.underlineThickness,
	);
	setOptionalAttribute(
		element,
		UNDERLINE_OFFSET_ATTRIBUTE,
		appearance.underlineOffset,
	);
	setOptionalAttribute(element, ANNOTATE_TEXT_ATTRIBUTE, appearance.annotate);
	setOptionalAttribute(
		element,
		ANNOTATE_COLOR_ATTRIBUTE,
		appearance.annotateColor,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_FONT_SIZE_ATTRIBUTE,
		appearance.annotateFontSize,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_OFFSET_X_ATTRIBUTE,
		appearance.annotateOffsetX,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_OFFSET_Y_ATTRIBUTE,
		appearance.annotateOffsetY,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_SPACING_ATTRIBUTE,
		appearance.annotateSpacing,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_VISIBLE_ATTRIBUTE,
		appearance.annotateVisible,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_POSITION_ATTRIBUTE,
		appearance.annotatePosition,
	);
	setOptionalAttribute(
		element,
		ANNOTATE_COMPACT_ATTRIBUTE,
		appearance.annotateCompact,
	);
}

function readAppearance(element: HTMLElement): TextGroupAppearance {
	return {
		textColor: element.getAttribute(TEXT_COLOR_ATTRIBUTE),
		textBackgroundColor: element.getAttribute(
			TEXT_BACKGROUND_COLOR_ATTRIBUTE,
		),
		underline: getOptionalBooleanAttribute(
			element,
			UNDERLINE_ATTRIBUTE,
		),
		underlineColor: element.getAttribute(UNDERLINE_COLOR_ATTRIBUTE),
		underlineThickness: getOptionalNumberAttribute(
			element,
			UNDERLINE_THICKNESS_ATTRIBUTE,
		),
		underlineOffset: getOptionalNumberAttribute(
			element,
			UNDERLINE_OFFSET_ATTRIBUTE,
		),
		annotate: element.getAttribute(ANNOTATE_TEXT_ATTRIBUTE),
		annotateColor: element.getAttribute(ANNOTATE_COLOR_ATTRIBUTE),
		annotateFontSize: getOptionalNumberAttribute(
			element,
			ANNOTATE_FONT_SIZE_ATTRIBUTE,
		),
		annotateOffsetX: getOptionalNumberAttribute(
			element,
			ANNOTATE_OFFSET_X_ATTRIBUTE,
		),
		annotateOffsetY: getOptionalNumberAttribute(
			element,
			ANNOTATE_OFFSET_Y_ATTRIBUTE,
		),
		annotateSpacing: getOptionalNumberAttribute(
			element,
			ANNOTATE_SPACING_ATTRIBUTE,
		),
		annotateVisible: getOptionalBooleanAttribute(
			element,
			ANNOTATE_VISIBLE_ATTRIBUTE,
		),
		annotatePosition: getOptionalAnnotatePosition(element),
		annotateCompact: getOptionalBooleanAttribute(
			element,
			ANNOTATE_COMPACT_ATTRIBUTE,
		),
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

function getOptionalBooleanAttribute(element: Element, name: string) {
	const value = element.getAttribute(name);
	if (value === null) return null;
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`Invalid ${name} attribute.`);
}

function getOptionalAnnotatePosition(element: Element) {
	const value = element.getAttribute(ANNOTATE_POSITION_ATTRIBUTE);
	if (value === null) return null;
	if (value === 'over' || value === 'under') return value;
	throw new Error(`Invalid ${ANNOTATE_POSITION_ATTRIBUTE} attribute.`);
}

function setOptionalAttribute(
	element: HTMLElement,
	name: string,
	value: string | number | boolean | null,
) {
	if (value === null) return;
	element.setAttribute(name, String(value));
}

function applyOptionalPixelStyle(
	element: HTMLElement,
	styles: Record<string, string>,
	attribute: string,
	property: string,
	value: number | null,
) {
	if (value === null) return;
	element.setAttribute(attribute, String(value));
	styles[property] = `${value}px`;
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

function addOptionalStyle(
	styles: Record<string, string>,
	property: string,
	value: string | null,
) {
	if (value !== null) styles[property] = value;
}

function addOptionalUnitStyle(
	styles: Record<string, string>,
	property: string,
	value: number | null,
	unit: string,
) {
	if (value !== null) styles[property] = `${value}${unit}`;
}
