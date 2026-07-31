import { Editor, EditorPosition, MarkdownView, Notice, Plugin } from 'obsidian';
import { AnnotateModal } from './ui/annotate-modal';

const ANNOTATE_ID_ATTRIBUTE = 'data-ba-annotate-id';
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
						new AnnotateModal(
							plugin.app,
							(text) => insertAnnotate(editor, cursor, text),
							DEVELOPMENT_TEST_TEXT,
						).open();
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
			() => deleteAnnotate(view.editor, id),
		).open();
	});
}

function insertAnnotate(editor: Editor, cursor: EditorPosition, text: string) {
	const prefix = cursor.ch > 0 ? '\n\n' : '';
	const block = createAnnotateBlock(crypto.randomUUID(), text);
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

function updateAnnotate(editor: Editor, id: string, text: string) {
	const source = editor.getValue();
	const range = findAnnotateRange(source, id);

	if (!range) {
		new Notice('Could not find this annotate.');
		return;
	}

	const replacement = createAnnotateBlock(id, text);
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
	const openingTag = `<div ${ANNOTATE_ID_ATTRIBUTE}="${id}">`;
	const start = source.indexOf(openingTag);
	const closingTagStart = source.indexOf('</div>', start + openingTag.length);

	if (start === -1 || closingTagStart === -1) return null;

	const blockEnd = closingTagStart + '</div>'.length;
	const trailingNewlines =
		source.slice(blockEnd).match(/^\n{0,2}/)?.[0].length ?? 0;

	return { start, end: blockEnd + trailingNewlines };
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
