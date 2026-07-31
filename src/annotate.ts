import {
	Editor,
	EditorPosition,
	MarkdownView,
	Notice,
	Plugin,
} from 'obsidian';
import { AnnotateModal } from './ui/annotate-modal';

const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';

export function registerAnnotateMenu(plugin: Plugin) {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			const cursor = editor.getCursor();

			menu.addItem((item) => {
				item.setTitle('Add annotate')
					.setIcon('message-square-plus')
					.onClick(() => {
						new AnnotateModal(plugin.app, (text) => {
							insertAnnotate(editor, cursor, text);
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

		new AnnotateModal(
			plugin.app,
			(text) => updateAnnotate(view.editor, id, text),
			annotate.innerText,
		).open();
	});
}

function insertAnnotate(
	editor: Editor,
	cursor: EditorPosition,
	text: string,
) {
	const line = editor.getLine(cursor.line);
	const prefix = cursor.ch > 0 ? '\n\n' : '';
	const suffix = cursor.ch < line.length ? '\n\n' : '';
	const block = createAnnotateBlock(crypto.randomUUID(), text);
	const insertion = `${prefix}${block}${suffix}`;

	editor.replaceRange(insertion, cursor);
	editor.setCursor(offsetPosition(cursor, insertion));
	editor.focus();
}

function updateAnnotate(editor: Editor, id: string, text: string) {
	const source = editor.getValue();
	const openingTag = `<div ${ANNOTATE_ID_ATTRIBUTE}="${id}">`;
	const startOffset = source.indexOf(openingTag);
	const endOffset = source.indexOf('</div>', startOffset + openingTag.length);

	if (startOffset === -1 || endOffset === -1) {
		new Notice('Could not find this annotate.');
		return;
	}

	const replacement = createAnnotateBlock(id, text);
	const from = editor.offsetToPos(startOffset);
	const to = editor.offsetToPos(endOffset + '</div>'.length);

	editor.replaceRange(replacement, from, to);
	editor.setCursor(editor.offsetToPos(startOffset + replacement.length));
	editor.focus();
}

function createAnnotateBlock(id: string, text: string) {
	const content = escapeHtml(text).replace(/\r?\n/g, '<br>');
	return `<div ${ANNOTATE_ID_ATTRIBUTE}="${id}">${content}</div>`;
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
