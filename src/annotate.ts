import { Editor, EditorPosition, MarkdownView, Notice, Plugin } from 'obsidian';
import { cloneAnnotateBlockAppearance } from './annotate-block/defaults';
import { AnnotateBlockAppearance } from './annotate-block/types';
import { BetterAnnotateSettings } from './settings';
import {
	ANNOTATE_ID_ATTRIBUTE,
	createAnnotateElement,
	readAnnotateElement,
} from './text-group/dom';
import { TextGroup } from './text-group/types';
import { EditAnnotateModal } from './ui/edit-annotate-modal';
import { CreateAnnotateModal } from './ui/create-annotate-modal';

export function registerAnnotateMenu(
	plugin: Plugin,
	settings: BetterAnnotateSettings,
) {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			const cursor = editor.getCursor();

			menu.addItem((item) => {
				item.setTitle('Add annotate')
					.setIcon('message-square-plus')
					.onClick(() => {
						const appearance = cloneAnnotateBlockAppearance(
							settings.defaultAnnotateAppearance,
						);
						new CreateAnnotateModal(plugin.app, {
							initialText: settings.devMode &&
								settings.addTestTextOnCreate
								? settings.testText
								: settings.defaultTextContent,
							onSave: (text) => {
								const id = insertAnnotate(
									editor,
									cursor,
									text,
									[],
									appearance,
								);
								openEditAnnotateModal(
									plugin,
									settings,
									editor,
									id,
									text,
									[],
									appearance,
								);
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
		const content = readAnnotateElement(annotate);

		openEditAnnotateModal(
			plugin,
			settings,
			view.editor,
			id,
			content.text,
			content.textGroups,
			content.appearance,
		);
	});
}

function openEditAnnotateModal(
	plugin: Plugin,
	settings: BetterAnnotateSettings,
	editor: Editor,
	id: string,
	text: string,
	textGroups: TextGroup[],
	appearance: AnnotateBlockAppearance,
) {
	new EditAnnotateModal(plugin.app, {
		initialText: text,
		initialTextGroups: textGroups,
		initialAppearance: appearance,
		fastGroupPresets: settings.fastGroupPresets,
		onSave: (updatedText, updatedTextGroups, updatedAppearance) => {
			updateAnnotate(
				editor,
				id,
				updatedText,
				updatedTextGroups,
				updatedAppearance,
			);
		},
		onDelete: () => deleteAnnotate(editor, id),
	}).open();
}

function insertAnnotate(
	editor: Editor,
	cursor: EditorPosition,
	text: string,
	textGroups: TextGroup[],
	appearance: AnnotateBlockAppearance,
) {
	const prefix = cursor.ch > 0 ? '\n\n' : '';
	const id = crypto.randomUUID();
	const block = createAnnotateBlock(id, text, textGroups, appearance);
	// 在 div 后保留一个空行，并把光标移动过去，以触发 Live Preview 渲染。
	const insertion = `${prefix}${block}\n\n`;

	editor.replaceRange(insertion, cursor);
	editor.setCursor(offsetPosition(cursor, insertion));
	editor.focus();
	return id;
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
	appearance: AnnotateBlockAppearance,
) {
	const source = editor.getValue();
	const range = findAnnotateRange(source, id);

	if (!range) {
		new Notice('Could not find this annotate.');
		return;
	}

	const replacement = createAnnotateBlock(
		id,
		text,
		textGroups,
		appearance,
	);
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
	appearance: AnnotateBlockAppearance,
) {
	return createAnnotateElement(
		document,
		id,
		text,
		textGroups,
		appearance,
	).outerHTML;
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
