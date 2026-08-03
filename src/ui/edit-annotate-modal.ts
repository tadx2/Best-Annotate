import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	Setting,
	TextAreaComponent,
} from 'obsidian';
import { cloneAnnotateBlockAppearance } from '../annotate-block/defaults';
import { AnnotateBlockAppearance } from '../annotate-block/types';
import { FastGroupPreset } from '../fast-group';
import {
	FinalPreviewMode,
	FinalPreviewSettings,
	htmlContentsAreEqual,
	renderHighlightedHtml,
	renderHtmlDiff,
} from '../final-preview';
import { formatHtml } from '../html-formatter';
import {
	appendAnnotatedText,
	createAnnotateElement,
	createAnnotateContentElement,
} from '../text-group/dom';
import {
	cloneTextGroupAppearance,
	createDefaultTextGroupAppearance,
} from '../text-group/defaults';
import { TextGroup, TextGroupAppearance } from '../text-group/types';
import { renderAnnotateBlockAppearanceSettings } from './annotate-block-appearance-settings';
import { renderTextGroupAppearanceSettings } from './text-group-appearance-settings';

const FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE = 'data-ba-preview-group-index';
let copiedTextGroupAppearance: TextGroupAppearance | null = null;

interface AnnotateTabDefinition<T extends string> {
	id: T;
	label: string;
	panelEl: HTMLElement;
}

function createTabNavigation<T extends string>(
	container: HTMLElement,
	definitions: readonly AnnotateTabDefinition<T>[],
	initialTab: T,
) {
	container.setAttribute('role', 'tablist');
	const items = definitions.map((definition) => {
		const button = container.createEl('button', {
			cls: 'ba-annotate-tab',
		});
		button.type = 'button';
		button.setText(definition.label);
		button.setAttribute('role', 'tab');
		definition.panelEl.setAttribute('role', 'tabpanel');
		return { ...definition, button };
	});

	const selectTab = (tabId: T) => {
		for (const item of items) {
			const selected = item.id === tabId;
			item.panelEl.hidden = !selected;
			item.button.toggleClass('is-active', selected);
			item.button.setAttribute('aria-selected', String(selected));
			item.button.tabIndex = selected ? 0 : -1;
		}
	};

	for (const item of items) {
		item.button.addEventListener('click', () => {
			selectTab(item.id);
		});
	}
	container.addEventListener('keydown', (event) => {
		const currentIndex = items.findIndex(
			(item) => item.button === event.target,
		);
		if (currentIndex === -1) return;

		let nextIndex: number | null = null;
		if (event.key === 'ArrowRight') {
			nextIndex = (currentIndex + 1) % items.length;
		} else if (event.key === 'ArrowLeft') {
			nextIndex = (currentIndex - 1 + items.length) % items.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = items.length - 1;
		}
		if (nextIndex === null) return;

		event.preventDefault();
		const nextItem = items[nextIndex];
		if (!nextItem) return;
		selectTab(nextItem.id);
		nextItem.button.focus();
	});

	selectTab(initialTab);
}

export interface EditAnnotateModalOptions {
	annotateId?: string;
	initialText?: string;
	initialTextGroups?: TextGroup[];
	initialAppearance: AnnotateBlockAppearance;
	finalPreviewSettings: FinalPreviewSettings;
	fastGroupPresets?: FastGroupPreset[];
	onSave: (
		text: string,
		textGroups: TextGroup[],
		appearance: AnnotateBlockAppearance,
	) => void;
	onDelete?: () => void;
}

export class EditAnnotateModal extends Modal {
	private text: string;
	private textGroups: TextGroup[];
	private appearance: AnnotateBlockAppearance;
	private readonly fastGroupPresets: FastGroupPreset[];
	private selectedTextGroupIndex: number | null = null;
	private selectedRange: { start: number; end: number } | null = null;
	private readonly handleSelectionChange = () =>
		this.handlePreviewSelectionChange();
	// Text Group Preview is temporarily disabled.
	private groupSettingsEl!: HTMLElement;
	private finalPreviewEl!: HTMLElement;
	private finalPreviewMode: FinalPreviewMode = 'render';
	private readonly finalPreviewModeButtons = new Map<
		FinalPreviewMode,
		ButtonComponent
	>();
	private lastPreviewHtml = '';
	private htmlDiffBefore = '';
	private htmlHighlightExpiresAt = 0;
	private htmlHighlightTimer: number | null = null;
	private selectedTextGroupEl!: HTMLElement;
	private fastGroupActionsEl!: HTMLElement;
	private groupTextButton!: ButtonComponent;
	private readonly fastGroupButtons: ButtonComponent[] = [];
	private ungroupTextButton!: ButtonComponent;
	private ungroupAllTextButton!: ButtonComponent;
	private copyTextGroupSettingButton!: ButtonComponent;
	private pasteTextGroupSettingButton!: ButtonComponent;
	// Clear group setting (without annotate text) is temporarily disabled.
	private clearTextGroupAllButton!: ButtonComponent;
	private paragraphTextArea!: TextAreaComponent;
	private paragraphTextButton!: ButtonComponent;
	private isParagraphTextEditing = false;

	constructor(
		app: App,
		private readonly options: EditAnnotateModalOptions,
	) {
		super(app);
		this.text = options.initialText ?? '';
		this.textGroups = (options.initialTextGroups ?? []).map((group) => ({
			...group,
			appearance: cloneTextGroupAppearance(group.appearance),
		}));
		this.appearance = cloneAnnotateBlockAppearance(
			options.initialAppearance,
		);
		this.fastGroupPresets = options.fastGroupPresets ?? [];
		this.finalPreviewMode = options.finalPreviewSettings.defaultMode;
	}

	onOpen() {
		this.setTitle('Edit annotate');
		this.modalEl.addClass('ba-annotate-modal');
		const layout = this.contentEl.createDiv('ba-annotate-layout');
		const stickyHeader = layout.createDiv(
			'ba-annotate-sticky-header',
		);
		const finalPreviewSection = stickyHeader.createDiv(
			'ba-annotate-final-preview-section',
		);
		const finalPreviewHeader = finalPreviewSection.createDiv(
			'ba-annotate-section-header',
		);
		finalPreviewHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Final preview',
		});
		const finalPreviewModes = finalPreviewHeader.createDiv(
			'ba-annotate-preview-modes',
		);
		for (const mode of [
			{ id: 'render', label: 'Render', icon: 'eye' },
			{ id: 'html', label: 'HTML', icon: 'code-2' },
		] as const) {
			const button = new ButtonComponent(finalPreviewModes)
				.setIcon(mode.icon)
				.setTooltip(`${mode.label} preview`)
				.onClick(() => this.setFinalPreviewMode(mode.id));
			button.buttonEl.createSpan({ text: mode.label });
			button.buttonEl.addClass('ba-annotate-preview-mode-button');
			this.finalPreviewModeButtons.set(mode.id, button);
		}
		this.updateFinalPreviewModeButtons();
		this.finalPreviewEl = finalPreviewSection.createDiv(
			'ba-annotate-final-preview',
		);
		this.finalPreviewEl.addEventListener('click', (event) => {
			this.selectFinalPreviewGroup(event.target);
		});
		this.finalPreviewEl.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			if (!this.getFinalPreviewGroupElement(event.target)) return;

			event.preventDefault();
			this.selectFinalPreviewGroup(event.target);
		});
		this.contentEl.ownerDocument.addEventListener(
			'selectionchange',
			this.handleSelectionChange,
		);
		this.lastPreviewHtml = this.createFinalPreviewHtml();
		this.htmlDiffBefore = this.lastPreviewHtml;
		const tabs = stickyHeader.createDiv('ba-annotate-tabs');

		const paragraphTabPanel = layout.createDiv(
			'ba-annotate-tab-panel',
		);
		const textGroupTabPanel = layout.createDiv(
			'ba-annotate-tab-panel',
		);
		textGroupTabPanel.addClass('ba-annotate-text-group-tab-panel');
		createTabNavigation(
			tabs,
			[
				{
					id: 'text-group',
					label: 'Text Group',
					panelEl: textGroupTabPanel,
				},
				{
					id: 'paragraph',
					label: 'Paragraph',
					panelEl: paragraphTabPanel,
				},
			] as const,
			'text-group',
		);

		const paragraphSettingSection = paragraphTabPanel.createDiv(
			'ba-annotate-paragraph-setting-section',
		);
		const annotateStyleSettingsEl = paragraphSettingSection.createDiv(
			'ba-annotate-block-style-settings',
		);
		renderAnnotateBlockAppearanceSettings(
			annotateStyleSettingsEl,
			this.appearance,
			{
				onChange: () => this.renderFinalPreview(),
				sectionContent: {
					Text: (container) => {
						this.renderParagraphTextContentSetting(container);
					},
				},
			},
		);
		const segmentsColumn = textGroupTabPanel.createDiv(
			'ba-annotate-column',
		);
		const groupColumn = textGroupTabPanel.createDiv(
			'ba-annotate-column',
		);

		this.selectedTextGroupEl = groupColumn.createDiv(
			'ba-annotate-selected-text-group',
		);
		/* Text Group Preview is temporarily disabled.
		this.selectedTextGroupEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text group preview',
		});
		this.textGroupPreviewEl = this.selectedTextGroupEl.createDiv(
			'ba-annotate-text-group-preview',
		);
		*/

		this.groupSettingsEl = this.selectedTextGroupEl.createDiv(
			'ba-annotate-group-settings',
		);

		const segmentActionRows = segmentsColumn.createDiv(
			'ba-annotate-segment-action-rows',
		);
		const groupActions = segmentActionRows.createDiv(
			'ba-annotate-segment-action-row',
		);
		this.groupTextButton = new ButtonComponent(groupActions)
			.setButtonText('Create group')
			.onClick(() => this.createTextGroups());
		this.groupTextButton.buttonEl.addClass(
			'ba-annotate-group-button',
		);
		this.ungroupTextButton = new ButtonComponent(groupActions)
			.setButtonText('Ungroup')
			.onClick(() => this.ungroupTextGroup());
		this.ungroupTextButton.buttonEl.addClass(
			'ba-annotate-ungroup-button',
		);
		this.ungroupAllTextButton = new ButtonComponent(groupActions)
			.setButtonText('Ungroup all')
			.setDestructive()
			.onClick(() => this.ungroupAllTextGroups());

		this.fastGroupActionsEl = segmentActionRows.createDiv(
			'ba-annotate-segment-action-row',
		);
		this.renderFastGroupButtons();

		const copyPasteGroupActions = segmentActionRows.createDiv(
			'ba-annotate-segment-action-row',
		);
		this.copyTextGroupSettingButton = new ButtonComponent(
			copyPasteGroupActions,
		)
			.setButtonText('Copy group setting')
			.onClick(() => this.copyTextGroupSetting());
		this.pasteTextGroupSettingButton = new ButtonComponent(
			copyPasteGroupActions,
		)
			.setButtonText('Paste group setting')
			.onClick(() => this.pasteTextGroupSetting());
		this.clearTextGroupAllButton = new ButtonComponent(
			copyPasteGroupActions,
		)
			.setButtonText('Clear group setting')
			.onClick(() => this.clearTextGroupAll());

		/* Clear group setting (without annotate text) is temporarily disabled.
		this.clearTextGroupStyleButton = new ButtonComponent(
			copyPasteGroupActions,
		)
			.setButtonText(
				'Clear group setting (without annotate text)',
			)
			.onClick(() => this.clearTextGroupStyles());
		*/

		this.selectedTextGroupIndex =
			this.textGroups.length > 0 ? 0 : null;
		this.renderSelectedTextGroup();
		this.updateActionButtons();
		this.renderFinalPreview();

		const actions = this.contentEl.createDiv('ba-annotate-actions');
		if (this.options.onDelete) {
			new ButtonComponent(actions)
				.setButtonText('Delete')
				.setDestructive()
				.onClick(() => this.delete());
		}

		const primaryActions = actions.createDiv(
			'ba-annotate-primary-actions',
		);
		new ButtonComponent(primaryActions)
			.setButtonText('Cancel')
			.onClick(() => this.close());
		new ButtonComponent(primaryActions)
			.setButtonText('Save')
			.setCta()
			.onClick(() => this.save());
	}

	onClose() {
		if (this.htmlHighlightTimer !== null) {
			window.clearTimeout(this.htmlHighlightTimer);
			this.htmlHighlightTimer = null;
		}
		this.contentEl.ownerDocument.removeEventListener(
			'selectionchange',
			this.handleSelectionChange,
		);
		this.contentEl.empty();
	}

	private renderFastGroupButtons() {
		this.fastGroupActionsEl.empty();
		this.fastGroupButtons.length = 0;
		for (const preset of this.fastGroupPresets) {
			const button = new ButtonComponent(this.fastGroupActionsEl)
				.setButtonText(preset.title.trim() || 'Preset')
				.onClick(() => this.createTextGroups(preset));
			button.buttonEl.addClass('ba-annotate-fast-group-button');
			button.buttonEl.setCssProps({
				'--ba-fast-group-button-color': preset.buttonColor,
				'--ba-fast-group-button-text-color':
					preset.buttonTextColor,
			});
			if (preset.description.trim()) {
				button.setTooltip(preset.description.trim());
			}
			this.fastGroupButtons.push(button);
		}
	}

	private renderParagraphTextContentSetting(container: HTMLElement) {
		const textContentSetting = new Setting(container)
			.setName('Text content')
			.setDesc(
				'Editing and saving the text content will reset all text groups.',
			);
		textContentSetting.nameEl.setText(['Text', 'Content'].join(' '));
		this.paragraphTextButton = new ButtonComponent(
			textContentSetting.controlEl,
		)
			.setButtonText('Edit')
			.onClick(() => this.toggleParagraphTextEditing());
		this.paragraphTextArea = new TextAreaComponent(container)
			.setPlaceholder('Enter annotate text')
			.setValue(this.text);
		this.paragraphTextArea.inputEl.rows = 5;
		this.paragraphTextArea.inputEl.readOnly = true;
		this.paragraphTextArea.inputEl.hidden = true;
		this.paragraphTextArea.inputEl.addClass('ba-annotate-textarea');
	}

	private toggleParagraphTextEditing() {
		if (!this.isParagraphTextEditing) {
			this.isParagraphTextEditing = true;
			this.paragraphTextArea.inputEl.readOnly = false;
			this.paragraphTextArea.inputEl.hidden = false;
			this.paragraphTextButton.setButtonText('Save');
			if (this.textGroups.length > 0) {
				new Notice(
					'Modifying the text will delete all existing groups.',
				);
			}
			this.paragraphTextArea.inputEl.focus();
			return;
		}

		this.saveParagraphText();
	}

	private saveParagraphText() {
		const text = this.paragraphTextArea.getValue();
		if (!text.trim()) {
			new Notice('Enter some text first.');
			return false;
		}

		const changed = text !== this.text;
		const deletedGroups = changed && this.textGroups.length > 0;
		if (changed) {
			this.text = text;
			this.textGroups = [];
			this.selectedTextGroupIndex = null;
			this.selectedRange = null;
			this.renderSelectedTextGroup();
			this.renderFinalPreview();
			this.updateActionButtons();
		}

		this.isParagraphTextEditing = false;
		this.paragraphTextArea.inputEl.readOnly = true;
		this.paragraphTextArea.inputEl.hidden = true;
		this.paragraphTextButton.setButtonText('Edit');
		if (deletedGroups) new Notice('All text groups were deleted.');
		return true;
	}

	private renderSelectedTextGroup() {
		// this.renderTextGroupPreview();
		this.renderGroupSettings();
	}

	private refreshPreviews() {
		// this.renderTextGroupPreview();
		this.renderFinalPreview();
	}

	/* Text Group Preview is temporarily disabled.
	private renderTextGroupPreview() {
		this.textGroupPreviewEl.empty();
		const selectedIndex = this.selectedTextGroupIndex;
		const group = selectedIndex === null
			? undefined
			: this.textGroups[selectedIndex];

		if (!group) {
			this.textGroupPreviewEl.createDiv({
				cls: 'setting-item-description',
				text: 'Select a text group to preview it.',
			});
			return;
		}

		const groupText = this.text.slice(group.start, group.end);
		this.textGroupPreviewEl.appendChild(
			createTextGroupElement(
				this.textGroupPreviewEl.ownerDocument,
				group,
				groupText,
			),
		);
	}
	*/

	private renderFinalPreview() {
		this.finalPreviewEl.empty();
		const currentHtml = this.createFinalPreviewHtml();
		this.updateHtmlHighlight(currentHtml);
		this.finalPreviewEl.toggleClass(
			'is-html-source',
			this.finalPreviewMode === 'html',
		);
		if (this.finalPreviewMode === 'html') {
			const formattedCurrentHtml = formatHtml(currentHtml);
			const pre = this.finalPreviewEl.createEl('pre', {
				cls: 'ba-annotate-final-preview-source',
			});
			const code = pre.createEl('code');
			if (this.shouldHighlightHtml(currentHtml)) {
				renderHtmlDiff(
					code,
					formatHtml(this.htmlDiffBefore),
					formattedCurrentHtml,
					this.options.finalPreviewSettings,
				);
			} else {
				renderHighlightedHtml(code, formattedCurrentHtml);
			}
			return;
		}

		const previewBlock = this.finalPreviewEl.createDiv(
			'ba-annotate-final-preview-block',
		);
		const previewContent = createAnnotateContentElement(
			previewBlock,
			this.appearance,
		);
		appendAnnotatedText(
			previewContent,
			this.text,
			this.textGroups,
			{
				onTextGroupElement: (element, _group, index) => {
					element.addClass('ba-annotate-final-preview-group');
					element.toggleClass(
						'is-active-text-group',
						index === this.selectedTextGroupIndex,
					);
					element.setAttribute(
						FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE,
						String(index),
					);
					element.setAttribute('role', 'button');
					element.tabIndex = 0;
				},
			},
		);
	}

	private createFinalPreviewHtml() {
		return createAnnotateElement(
			this.finalPreviewEl.ownerDocument,
			this.options.annotateId ?? 'preview',
			this.text,
			this.textGroups,
			this.appearance,
		).outerHTML;
	}

	private updateHtmlHighlight(currentHtml: string) {
		if (htmlContentsAreEqual(currentHtml, this.lastPreviewHtml)) {
			this.lastPreviewHtml = currentHtml;
			return;
		}
		this.htmlDiffBefore = this.lastPreviewHtml;
		this.lastPreviewHtml = currentHtml;
		if (this.htmlHighlightTimer !== null) {
			window.clearTimeout(this.htmlHighlightTimer);
			this.htmlHighlightTimer = null;
		}
		const duration = this.options.finalPreviewSettings.highlightDuration;
		if (duration === 0) {
			this.htmlHighlightExpiresAt = Number.POSITIVE_INFINITY;
			return;
		}
		this.htmlHighlightExpiresAt = Date.now() + duration * 1000;
		this.htmlHighlightTimer = window.setTimeout(() => {
			this.htmlHighlightTimer = null;
			this.htmlHighlightExpiresAt = 0;
			if (this.finalPreviewMode === 'html') {
				this.renderFinalPreview();
			}
		}, duration * 1000);
	}

	private shouldHighlightHtml(currentHtml: string) {
		return (
			!htmlContentsAreEqual(currentHtml, this.htmlDiffBefore) &&
			Date.now() < this.htmlHighlightExpiresAt
		);
	}

	private setFinalPreviewMode(mode: FinalPreviewMode) {
		if (this.finalPreviewMode === mode) return;
		this.finalPreviewMode = mode;
		if (mode === 'html') {
			this.clearPreviewDomSelection();
			this.selectedRange = null;
			this.updateActionButtons();
		}
		this.updateFinalPreviewModeButtons();
		this.renderFinalPreview();
	}

	private updateFinalPreviewModeButtons() {
		for (const [mode, button] of this.finalPreviewModeButtons) {
			const active = mode === this.finalPreviewMode;
			button.buttonEl.toggleClass('is-active', active);
			button.buttonEl.setAttribute('aria-pressed', String(active));
		}
	}

	private selectFinalPreviewGroup(target: EventTarget | null) {
		const element = this.getFinalPreviewGroupElement(target);
		if (!element) return;

		const index = Number(
			element.getAttribute(FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE),
		);
		if (Number.isInteger(index)) {
			this.selectTextGroup(index);
		}
	}

	private selectTextGroup(index: number) {
		if (index < 0 || index >= this.textGroups.length) return;

		this.selectedTextGroupIndex =
			this.selectedTextGroupIndex === index ? null : index;
		this.selectedRange = null;
		this.clearPreviewDomSelection();
		this.finalPreviewEl
			.querySelectorAll(
				'.ba-annotate-final-preview-group.is-active-text-group',
			)
			.forEach((element) =>
				element.removeClass('is-active-text-group'),
			);
		if (this.selectedTextGroupIndex !== null) {
			this.finalPreviewEl
				.querySelector(
					`[${FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE}="${this.selectedTextGroupIndex}"]`,
				)
				?.addClass('is-active-text-group');
		}
		this.renderSelectedTextGroup();
		this.updateActionButtons();
	}

	private getFinalPreviewGroupElement(target: EventTarget | null) {
		if (!(target instanceof Element)) return null;

		const element = target.closest<HTMLElement>(
			`[${FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE}]`,
		);
		return element && this.finalPreviewEl.contains(element)
			? element
			: null;
	}

	private handlePreviewSelectionChange() {
		const range =
			this.finalPreviewMode === 'render'
				? this.getSelectionTextRange()
				: null;
		const changed =
			range?.start !== this.selectedRange?.start ||
			range?.end !== this.selectedRange?.end;
		this.selectedRange = range;
		if (range && this.selectedTextGroupIndex !== null) {
			this.selectedTextGroupIndex = null;
			this.finalPreviewEl
				.querySelectorAll(
					'.ba-annotate-final-preview-group.is-active-text-group',
				)
				.forEach((element) =>
					element.removeClass('is-active-text-group'),
				);
			this.renderSelectedTextGroup();
		}
		if (changed) this.updateActionButtons();
	}

	private getSelectionTextRange() {
		const selection = this.finalPreviewEl.ownerDocument.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			return null;
		}

		const range = selection.getRangeAt(0);
		if (!this.finalPreviewEl.contains(range.commonAncestorContainer)) {
			return null;
		}

		const start = this.getPreviewTextOffset(
			range.startContainer,
			range.startOffset,
		);
		const end = this.getPreviewTextOffset(
			range.endContainer,
			range.endOffset,
		);
		if (start === null || end === null) return null;
		return { start: Math.min(start, end), end: Math.max(start, end) };
	}

	private getPreviewTextOffset(target: Node, targetOffset: number) {
		let offset = 0;
		let found = false;
		const visit = (node: Node): void => {
			if (found) return;
			if (node === target) {
				if (node.nodeType === Node.TEXT_NODE) {
					offset += targetOffset;
				} else {
					for (let index = 0; index < targetOffset; index++) {
						const child = node.childNodes[index];
						if (child) offset += this.getNodeTextLength(child);
					}
				}
				found = true;
				return;
			}
			if (node.nodeType === Node.TEXT_NODE) {
				offset += node.textContent?.length ?? 0;
				return;
			}
			if (node.nodeType !== Node.ELEMENT_NODE) return;
			const element = node as Element;
			if (element.tagName === 'RT' || element.tagName === 'RP') return;
			if (element.tagName === 'BR') {
				offset += 1;
				return;
			}
			node.childNodes.forEach(visit);
		};
		this.finalPreviewEl.childNodes.forEach(visit);
		return found ? offset : null;
	}

	private getNodeTextLength(node: Node): number {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent?.length ?? 0;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return 0;
		const element = node as Element;
		if (element.tagName === 'RT' || element.tagName === 'RP') return 0;
		if (element.tagName === 'BR') return 1;
		let length = 0;
		node.childNodes.forEach((child) => {
			length += this.getNodeTextLength(child);
		});
		return length;
	}

	private clearPreviewDomSelection() {
		const selection = this.finalPreviewEl.ownerDocument.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		if (
			this.finalPreviewEl.contains(
				selection.getRangeAt(0).commonAncestorContainer,
			)
		) {
			selection.removeAllRanges();
		}
	}

	private renderGroupSettings() {
		this.groupSettingsEl.empty();
		const selectedIndex = this.selectedTextGroupIndex;
		const group = selectedIndex === null
			? undefined
			: this.textGroups[selectedIndex];

		if (!group) {
			this.groupSettingsEl.createDiv({
				cls: 'setting-item-description',
				text: 'Select a text group to configure it.',
			});
			return;
		}

		renderTextGroupAppearanceSettings(
			this.groupSettingsEl,
			group.appearance,
			{
				onChange: () => this.refreshPreviews(),
				displayMode: 'tabs',
			},
		);
	}

	private createTextGroups(preset?: FastGroupPreset) {
		const range = this.selectedRange;
		if (!range || range.start >= range.end) return;

		if (this.rangeOverlapsTextGroup(range.start, range.end)) {
			new Notice('Selection overlaps an existing group. Ungroup it first.');
			return;
		}

		const group: TextGroup = {
			start: range.start,
			end: range.end,
			appearance: preset
				? cloneTextGroupAppearance(preset.appearance)
				: createDefaultTextGroupAppearance(),
		};
		this.textGroups.push(group);
		this.textGroups.sort((a, b) => a.start - b.start);
		this.selectedTextGroupIndex = this.textGroups.indexOf(group);
		this.selectedRange = null;
		this.clearPreviewDomSelection();
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
		this.updateActionButtons();
	}

	private rangeOverlapsTextGroup(start: number, end: number) {
		return this.textGroups.some(
			(group) => start < group.end && end > group.start,
		);
	}

	private ungroupTextGroup() {
		const selectedIndex = this.selectedTextGroupIndex;
		if (selectedIndex === null || !this.textGroups[selectedIndex]) return;

		this.textGroups.splice(selectedIndex, 1);
		this.selectedTextGroupIndex = null;
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
		this.updateActionButtons();
	}

	private ungroupAllTextGroups() {
		if (this.textGroups.length === 0) return;

		this.textGroups = [];
		this.selectedTextGroupIndex = null;
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
		this.updateActionButtons();
	}

	private clearTextGroupStyles() {
		const group = this.getSelectedTextGroup();
		if (!group) return;

		this.resetTextGroupStyles(group);
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private copyTextGroupSetting() {
		const group = this.getSelectedTextGroup();
		if (!group) return;

		copiedTextGroupAppearance = cloneTextGroupAppearance(
			group.appearance,
		);
		this.updateActionButtons();
		new Notice('Group setting copied.');
	}

	private pasteTextGroupSetting() {
		const group = this.getSelectedTextGroup();
		if (!group || !copiedTextGroupAppearance) return;

		group.appearance = cloneTextGroupAppearance(
			copiedTextGroupAppearance,
		);
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
		new Notice('Group setting pasted.');
	}

	private clearTextGroupAll() {
		const group = this.getSelectedTextGroup();
		if (!group) return;

		this.resetTextGroupStyles(group);
		group.appearance.annotate = null;
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private resetTextGroupStyles(group: TextGroup) {
		const annotate = group.appearance.annotate;
		group.appearance = createDefaultTextGroupAppearance();
		group.appearance.annotate = annotate;
	}

	private getSelectedTextGroup() {
		const selectedIndex = this.selectedTextGroupIndex;
		return selectedIndex === null
			? undefined
			: this.textGroups[selectedIndex];
	}

	private updateActionButtons() {
		const hasSelection = this.selectedRange !== null;
		this.groupTextButton.buttonEl.disabled = !hasSelection;
		for (const button of this.fastGroupButtons) {
			button.buttonEl.disabled = !hasSelection;
		}
		const hasSelectedTextGroup = this.selectedTextGroupIndex !== null;
		this.ungroupTextButton.buttonEl.disabled = !hasSelectedTextGroup;
		this.ungroupAllTextButton.buttonEl.disabled =
			this.textGroups.length === 0 ||
			hasSelection ||
			hasSelectedTextGroup;
		this.copyTextGroupSettingButton.buttonEl.disabled =
			!hasSelectedTextGroup;
		this.pasteTextGroupSettingButton.buttonEl.disabled =
			!hasSelectedTextGroup || copiedTextGroupAppearance === null;
		// this.clearTextGroupStyleButton.buttonEl.disabled =
		// 	!hasSelectedTextGroup;
		this.clearTextGroupAllButton.buttonEl.disabled =
			!hasSelectedTextGroup;
		this.updateRightColumn();
	}

	private updateRightColumn() {
		const showSelectedTextGroup = this.selectedTextGroupIndex !== null;
		this.selectedTextGroupEl.toggleClass(
			'ba-annotate-is-hidden',
			!showSelectedTextGroup,
		);
	}

	private save() {
		if (
			this.isParagraphTextEditing &&
			!this.saveParagraphText()
		) {
			return;
		}
		if (!this.text.trim()) {
			new Notice('Enter some text first.');
			return;
		}

		this.options.onSave(
			this.text,
			this.textGroups,
			cloneAnnotateBlockAppearance(this.appearance),
		);
		this.close();
	}

	private delete() {
		this.options.onDelete?.();
		this.close();
	}
}
