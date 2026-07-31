import { TextGroup } from './text-segmentation';

const DEFAULT_COLOR = '#000000';

export const TEXT_COLOR_ATTRIBUTE = 'data-ba-text-color';
export const TEXT_BACKGROUND_COLOR_ATTRIBUTE =
	'data-ba-text-background-color';
export const UNDERLINE_ATTRIBUTE = 'data-ba-underline';
export const UNDERLINE_COLOR_ATTRIBUTE = 'data-ba-underline-color';
export const ANNOTATE_COLOR_ATTRIBUTE = 'data-ba-annotate-color';
export const ANNOTATE_VISIBLE_ATTRIBUTE = 'data-ba-annotate-visible';
export const ANNOTATE_POSITION_ATTRIBUTE = 'data-ba-annotate-position';
export const ANNOTATE_COMPACT_ATTRIBUTE = 'data-ba-annotate-compact';

export function createTextGroupElement(
	doc: Document,
	group: TextGroup,
	text: string,
) {
	const textColor = normalizeColor(group.textColor, DEFAULT_COLOR);
	const textBackgroundColor = normalizeOptionalColor(
		group.textBackgroundColor,
	);
	const underlineColor = normalizeColor(group.underlineColor, textColor);
	const annotateColor = normalizeColor(group.annotateColor, DEFAULT_COLOR);
	const annotateVisible = group.annotateVisible ?? true;
	const annotatePosition = group.annotatePosition === 'over'
		? 'over'
		: 'under';
	const annotateCompact = group.annotateCompact ?? true;

	const ruby = doc.createElement('ruby');
	ruby.classList.add('ba-text-group');
	ruby.style.setProperty('--ba-text-color', textColor);
	ruby.style.setProperty(
		'--ba-text-background-color',
		textBackgroundColor ?? 'transparent',
	);
	ruby.style.setProperty('--ba-underline-color', underlineColor);
	ruby.style.setProperty('--ba-annotate-color', annotateColor);
	ruby.style.setProperty('ruby-position', annotatePosition);
	ruby.style.setProperty(
		'ruby-align',
		annotateCompact ? 'center' : 'space-around',
	);
	ruby.setAttribute(TEXT_COLOR_ATTRIBUTE, textColor);
	if (textBackgroundColor) {
		ruby.setAttribute(
			TEXT_BACKGROUND_COLOR_ATTRIBUTE,
			textBackgroundColor,
		);
	}
	ruby.setAttribute(UNDERLINE_ATTRIBUTE, String(group.underline ?? false));
	ruby.setAttribute(UNDERLINE_COLOR_ATTRIBUTE, underlineColor);
	ruby.setAttribute(ANNOTATE_COLOR_ATTRIBUTE, annotateColor);
	ruby.setAttribute(ANNOTATE_VISIBLE_ATTRIBUTE, String(annotateVisible));
	ruby.setAttribute(ANNOTATE_POSITION_ATTRIBUTE, annotatePosition);
	ruby.setAttribute(ANNOTATE_COMPACT_ATTRIBUTE, String(annotateCompact));

	const base = doc.createElement('span');
	base.classList.add('ba-text-group-base');
	base.style.color = textColor;
	base.style.backgroundColor = textBackgroundColor ?? 'transparent';
	if (group.underline) {
		const underline = doc.createElement('u');
		underline.style.textDecorationColor = underlineColor;
		appendText(underline, text);
		base.appendChild(underline);
	} else {
		appendText(base, text);
	}
	ruby.appendChild(base);

	if (group.annotate) {
		const annotate = doc.createElement('rt');
		const annotateCssProps: Record<string, string> = {
			color: annotateColor,
		};
		if (!annotateVisible) annotateCssProps.display = 'none';
		if (annotateCompact) {
			annotateCssProps['font-size'] = '0.55em';
			annotateCssProps['line-height'] = '1';
		}
		annotate.setCssProps(annotateCssProps);
		appendText(annotate, group.annotate);
		ruby.appendChild(annotate);
	}

	return ruby;
}

export function appendAnnotatedText(
	container: HTMLElement,
	text: string,
	textGroups: TextGroup[],
) {
	const groups = textGroups
		.filter(
			(group) =>
				group.start >= 0 &&
				group.end > group.start &&
				group.end <= text.length,
		)
		.sort((a, b) => a.start - b.start);
	let cursor = 0;

	for (const group of groups) {
		if (group.start < cursor) continue;

		appendText(container, text.slice(cursor, group.start));
		container.appendChild(
			createTextGroupElement(
				container.ownerDocument,
				group,
				text.slice(group.start, group.end),
			),
		);
		cursor = group.end;
	}

	appendText(container, text.slice(cursor));
}

function appendText(container: HTMLElement, text: string) {
	text.split(/\r?\n/).forEach((line, index) => {
		if (index > 0) container.appendChild(container.ownerDocument.createElement('br'));
		container.appendChild(container.ownerDocument.createTextNode(line));
	});
}

function normalizeColor(color: string | undefined, fallback: string) {
	return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color! : fallback;
}

function normalizeOptionalColor(color: string | undefined) {
	return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : undefined;
}
