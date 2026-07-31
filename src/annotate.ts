import { Editor, EditorPosition, MarkdownView, Notice, Plugin } from 'obsidian';
import { TextGroup } from './text-segmentation';
import { AnnotateModal } from './ui/annotate-modal';

const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';
const TEXT_COLOR_ATTRIBUTE = 'data-ba-text-color';
const TEXT_BACKGROUND_COLOR_ATTRIBUTE = 'data-ba-text-background-color';
const UNDERLINE_ATTRIBUTE = 'data-ba-underline';
const UNDERLINE_COLOR_ATTRIBUTE = 'data-ba-underline-color';
const ANNOTATE_COLOR_ATTRIBUTE = 'data-ba-annotate-color';
const ANNOTATE_VISIBLE_ATTRIBUTE = 'data-ba-annotate-visible';
const ANNOTATE_POSITION_ATTRIBUTE = 'data-ba-annotate-position';
const ANNOTATE_COMPACT_ATTRIBUTE = 'data-ba-annotate-compact';
const DEVELOPMENT_TEST_TEXT =
	'这是用于开发阶段测试标注功能默认文字内容方便快速检查弹窗输入保存编辑删除以及页面渲染是否能够正常工作,这是用于开发阶段测试标注功能默认文字内容方便快速检查弹窗输入保存编辑删除以及页面渲染是否能够正常工作,这是用于开发阶段测试标注功能默认文字内容方便快速检查弹窗输入保存编辑删除以及页面渲染是否能够正常工作。';

export function registerAnnotateMenu(plugin: Plugin) {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			const cursor = editor.getCursor();

			menu.addItem((item) => {
				item.setTitle('Add annotate')
					.setIcon('message-square-plus')
					.onClick(() => {
						new AnnotateModal(plugin.app, {
							initialText: DEVELOPMENT_TEST_TEXT,
							onSave: (text, textGroups) => {
								insertAnnotate(editor, cursor, text, textGroups);
							},
						}).open();
					});
			});
		}),
	);

	plugin.registerDomEvent(document, 'click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const annotate = target.closest<HTMLElement>(
			`div[${ANNOTATE_ID_ATTRIBUTE}]`,
		);
		if (!annotate) return;

		const id = annotate.getAttribute(ANNOTATE_ID_ATTRIBUTE);
		const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!id || !view) return;
		const content = extractAnnotateContent(annotate);

		new AnnotateModal(plugin.app, {
			initialText: content.text,
			initialTextGroups: content.textGroups,
			onSave: (text, textGroups) => {
				updateAnnotate(view.editor, id, text, textGroups);
			},
			onDelete: () => deleteAnnotate(view.editor, id),
		}).open();
	});
}

function insertAnnotate(
	editor: Editor,
	cursor: EditorPosition,
	text: string,
	textGroups: TextGroup[],
) {
	const prefix = cursor.ch > 0 ? '\n\n' : '';
	const block = createAnnotateBlock(crypto.randomUUID(), text, textGroups);
	// 在 div 后保留一个空行，并把光标移动过去，以触发 Live Preview 渲染。
	const insertion = `${prefix}${block}\n\n`;

	editor.replaceRange(insertion, cursor);
	editor.setCursor(offsetPosition(cursor, insertion));
	editor.focus();
}

function deleteAnnotate(editor: Editor, id: string) {
	const source = editor.getValue();
	const range = findAnnotateRange(source, id);

	if (!range) {
		new Notice('Could not find this annotate.');
		return;
	}

	const from = editor.offsetToPos(range.start);
	const to = editor.offsetToPos(range.end);

	editor.replaceRange('', from, to);
	editor.setCursor(editor.offsetToPos(range.start));
	editor.focus();
}

function updateAnnotate(
	editor: Editor,
	id: string,
	text: string,
	textGroups: TextGroup[],
) {
	const source = editor.getValue();
	const range = findAnnotateRange(source, id);

	if (!range) {
		new Notice('Could not find this annotate.');
		return;
	}

	const replacement = createAnnotateBlock(id, text, textGroups);
	const from = editor.offsetToPos(range.start);
	const to = editor.offsetToPos(range.end);
	const replacementWithNewlines = `${replacement}\n\n`;

	editor.replaceRange(replacementWithNewlines, from, to);
	editor.setCursor(
		editor.offsetToPos(range.start + replacementWithNewlines.length),
	);
	editor.focus();
}

function findAnnotateRange(source: string, id: string) {
	const openingTagStart = `<div ${ANNOTATE_ID_ATTRIBUTE}="${id}"`;
	const start = source.indexOf(openingTagStart);
	const closingTagStart = source.indexOf(
		'</div>',
		start + openingTagStart.length,
	);

	if (start === -1 || closingTagStart === -1) return null;

	const blockEnd = closingTagStart + '</div>'.length;
	const trailingNewlines =
		source.slice(blockEnd).match(/^\n{0,2}/)?.[0].length ?? 0;

	return { start, end: blockEnd + trailingNewlines };
}

function createAnnotateBlock(
	id: string,
	text: string,
	textGroups: TextGroup[],
) {
	const content = renderGroupedText(text, textGroups);
	return `<div ${ANNOTATE_ID_ATTRIBUTE}="${id}">${content}</div>`;
}

function renderGroupedText(text: string, textGroups: TextGroup[]) {
	const groups = textGroups
		.filter(
			(group) =>
				group.start >= 0 &&
				group.end > group.start &&
				group.end <= text.length,
		)
		.sort((a, b) => a.start - b.start);
	let content = '';
	let cursor = 0;

	for (const group of groups) {
		if (group.start < cursor) continue;

		content += renderText(text.slice(cursor, group.start));
		const textColor = normalizeColor(group.textColor, '#000000');
		const textBackgroundColor = normalizeOptionalColor(
			group.textBackgroundColor,
		);
		const underlineColor = normalizeColor(
			group.underlineColor,
			textColor,
		);
		const annotateColor = normalizeColor(group.annotateColor, '#000000');
		const annotatePosition = group.annotatePosition === 'over'
			? 'over'
			: 'under';
		const styles = [
			`--ba-text-color: ${textColor}`,
			`--ba-text-background-color: ${textBackgroundColor ?? 'transparent'}`,
			`--ba-underline-color: ${underlineColor}`,
			`--ba-annotate-color: ${annotateColor}`,
		].join('; ');
		const groupText = renderText(text.slice(group.start, group.end));
		const decoratedText = group.underline
			? `<u>${groupText}</u>`
			: groupText;
		const base = `<span class="ba-text-group-base">${decoratedText}</span>`;
		const annotate = group.annotate
			? `<rt>${renderText(group.annotate)}</rt>`
			: '';
		const backgroundAttribute = textBackgroundColor
			? ` ${TEXT_BACKGROUND_COLOR_ATTRIBUTE}="${textBackgroundColor}"`
			: '';
		content += `<ruby class="ba-text-group" style="${styles};" ${TEXT_COLOR_ATTRIBUTE}="${textColor}"${backgroundAttribute} ${UNDERLINE_ATTRIBUTE}="${String(group.underline ?? false)}" ${UNDERLINE_COLOR_ATTRIBUTE}="${underlineColor}" ${ANNOTATE_COLOR_ATTRIBUTE}="${annotateColor}" ${ANNOTATE_VISIBLE_ATTRIBUTE}="${String(group.annotateVisible ?? true)}" ${ANNOTATE_POSITION_ATTRIBUTE}="${annotatePosition}" ${ANNOTATE_COMPACT_ATTRIBUTE}="${String(group.annotateCompact ?? true)}">${base}${annotate}</ruby>`;
		cursor = group.end;
	}

	return content + renderText(text.slice(cursor));
}

function renderText(text: string) {
	return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

function normalizeColor(color: string | undefined, fallback: string) {
	return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color! : fallback;
}

function normalizeOptionalColor(color: string | undefined) {
	return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : undefined;
}

function extractAnnotateContent(annotate: HTMLElement) {
	let text = '';
	const textGroups: TextGroup[] = [];

	const visit = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? '';
			return;
		}
		if (!node.instanceOf(HTMLElement)) return;
		if (node.tagName === 'BR') {
			text += '\n';
			return;
		}
		if (node.tagName === 'RT' || node.tagName === 'RP') return;

		if (node.tagName === 'RUBY') {
			const start = text.length;
			const annotateText = Array.from(node.children).find(
				(child) => child.tagName === 'RT',
			)?.textContent ?? '';
			node.childNodes.forEach(visit);
			if (text.length > start) {
				textGroups.push({
					start,
					end: text.length,
					textColor:
						node.getAttribute(TEXT_COLOR_ATTRIBUTE) ?? undefined,
					textBackgroundColor:
						node.getAttribute(TEXT_BACKGROUND_COLOR_ATTRIBUTE) ??
						undefined,
					underline:
						node.getAttribute(UNDERLINE_ATTRIBUTE) === 'true' ||
						node.querySelector('u') !== null,
					underlineColor:
						node.getAttribute(UNDERLINE_COLOR_ATTRIBUTE) ?? undefined,
					annotate: annotateText,
					annotateColor:
						node.getAttribute(ANNOTATE_COLOR_ATTRIBUTE) ?? undefined,
					annotateVisible:
						node.getAttribute(ANNOTATE_VISIBLE_ATTRIBUTE) !== 'false',
					annotatePosition:
						node.getAttribute(ANNOTATE_POSITION_ATTRIBUTE) === 'over'
							? 'over'
							: 'under',
					annotateCompact:
						node.getAttribute(ANNOTATE_COMPACT_ATTRIBUTE) !== 'false',
				});
			}
			return;
		}

		node.childNodes.forEach(visit);
	};

	annotate.childNodes.forEach(visit);
	return { text, textGroups };
}

function escapeHtml(text: string) {
	// 将用户输入中的 HTML 特殊字符转成普通文本。
	// 例如输入 <script> 时，最终只会显示这段文字，不会被浏览器当作标签执行。
	// 必须先替换 &，否则后续生成的 &lt;、&gt; 等内容会被再次转义。
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function offsetPosition(
	start: EditorPosition,
	insertedText: string,
): EditorPosition {
	// 根据插入文字的行数，计算插入完成后光标应该移动到的位置。
	const lines = insertedText.split('\n');

	// 插入内容只有一行：行号不变，列号增加插入文字的长度。
	if (lines.length === 1) {
		return { line: start.line, ch: start.ch + insertedText.length };
	}

	// 插入内容有多行：移动到最后一行末尾。
	// 新行号 = 原行号 + 新增的行数；新列号 = 最后一行的文字长度。
	return {
		line: start.line + lines.length - 1,
		ch: lines[lines.length - 1]?.length ?? 0,
	};
}
