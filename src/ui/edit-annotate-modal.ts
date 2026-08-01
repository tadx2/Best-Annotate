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
	applyAnnotateBlockAppearance,
	appendAnnotatedText,
	createTextGroupElement,
} from '../text-group/dom';
import {
	cloneTextGroupAppearance,
	createDefaultTextGroupAppearance,
} from '../text-group/defaults';
import { TextGroup } from '../text-group/types';
import { renderAnnotateBlockAppearanceSettings } from './annotate-block-appearance-settings';
import { SegmentSelector } from './segment-selector';
import { renderTextGroupAppearanceSettings } from './text-group-appearance-settings';

const FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE = 'data-ba-preview-group-index';

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
	initialText?: string;
	initialTextGroups?: TextGroup[];
	initialAppearance: AnnotateBlockAppearance;
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
	private segmentsEl!: HTMLElement;
	private segmentSelector!: SegmentSelector;
	private textGroupPreviewEl!: HTMLElement;
	private groupSettingsEl!: HTMLElement;
	private finalPreviewEl!: HTMLElement;
	private groupCreationEl!: HTMLElement;
	private selectedTextGroupEl!: HTMLElement;
	private segmentGroupActionsEl!: HTMLElement;
	private groupTextButton!: ButtonComponent;
	private readonly fastGroupButtons: ButtonComponent[] = [];
	private ungroupTextButton!: ButtonComponent;
	private ungroupAllTextButton!: ButtonComponent;
	private clearTextGroupStyleButton!: ButtonComponent;
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
					id: 'paragraph',
					label: 'Paragraph',
					panelEl: paragraphTabPanel,
				},
				{
					id: 'text-group',
					label: 'Text Group',
					panelEl: textGroupTabPanel,
				},
			] as const,
			'paragraph',
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

		this.groupCreationEl = groupColumn.createDiv(
			'ba-annotate-group-creation',
		);
		this.groupTextButton = new ButtonComponent(this.groupCreationEl)
			.setButtonText('Group')
			.onClick(() => this.createTextGroups());
		this.fastGroupButtons.length = 0;
		for (const preset of this.options.fastGroupPresets ?? []) {
			const button = new ButtonComponent(this.groupCreationEl)
				.setButtonText(preset.title.trim() || 'Fast group')
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

		this.selectedTextGroupEl = groupColumn.createDiv(
			'ba-annotate-selected-text-group',
		);
		this.selectedTextGroupEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text group preview',
		});
		this.textGroupPreviewEl = this.selectedTextGroupEl.createDiv(
			'ba-annotate-text-group-preview',
		);

		const groupSettingsHeader = this.selectedTextGroupEl.createDiv(
			'ba-annotate-section-header',
		);
		groupSettingsHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text group settings',
		});
		const groupSettingsActions = groupSettingsHeader.createDiv(
			'ba-annotate-section-actions',
		);
		this.clearTextGroupStyleButton = new ButtonComponent(
			groupSettingsActions,
		)
			.setButtonText('Clear style')
			.onClick(() => this.clearTextGroupStyles());
		this.clearTextGroupAllButton = new ButtonComponent(
			groupSettingsActions,
		)
			.setButtonText('Clear all')
			.onClick(() => this.clearTextGroupAll());
		this.groupSettingsEl = this.selectedTextGroupEl.createDiv(
			'ba-annotate-group-settings',
		);

		const segmentsHeader = segmentsColumn.createDiv(
			'ba-annotate-section-header',
		);
		segmentsHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Segments',
		});
		this.segmentGroupActionsEl = segmentsHeader.createDiv(
			'ba-annotate-section-actions',
		);
		this.ungroupAllTextButton = new ButtonComponent(
			this.segmentGroupActionsEl,
		)
			.setButtonText('Ungroup all')
			.setDestructive()
			.onClick(() => this.ungroupAllTextGroups());
		this.ungroupTextButton = new ButtonComponent(
			this.segmentGroupActionsEl,
		)
			.setButtonText('Ungroup')
			.onClick(() => this.ungroupTextGroup());
		this.ungroupTextButton.buttonEl.addClass(
			'ba-annotate-ungroup-button',
		);

		this.segmentsEl = segmentsColumn.createDiv('ba-annotate-segments');
		this.segmentSelector = new SegmentSelector(this.segmentsEl, () => {
			this.renderSelectedTextGroup();
			this.updateSegmentActionButtons();
		});
		this.segmentSelector.setData(
			this.text,
			this.textGroups,
			this.textGroups.length > 0 ? 0 : null,
		);
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
		this.contentEl.empty();
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
			this.segmentSelector.setData(this.text, this.textGroups);
			this.renderFinalPreview();
		}

		this.isParagraphTextEditing = false;
		this.paragraphTextArea.inputEl.readOnly = true;
		this.paragraphTextArea.inputEl.hidden = true;
		this.paragraphTextButton.setButtonText('Edit');
		if (deletedGroups) new Notice('All text groups were deleted.');
		return true;
	}

	private renderSelectedTextGroup() {
		this.renderTextGroupPreview();
		this.renderGroupSettings();
	}

	private refreshPreviews() {
		this.renderTextGroupPreview();
		this.renderFinalPreview();
	}

	private renderTextGroupPreview() {
		this.textGroupPreviewEl.empty();
		const selectedIndex =
			this.segmentSelector.getSelectedTextGroupIndex();
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

	private renderFinalPreview() {
		this.finalPreviewEl.empty();
		const previewBlock = this.finalPreviewEl.createDiv(
			'ba-annotate-final-preview-block',
		);
		applyAnnotateBlockAppearance(previewBlock, this.appearance);
		appendAnnotatedText(
			previewBlock,
			this.text,
			this.textGroups,
			{
				onTextGroupElement: (element, _group, index) => {
					element.addClass('ba-annotate-final-preview-group');
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

	private selectFinalPreviewGroup(target: EventTarget | null) {
		const element = this.getFinalPreviewGroupElement(target);
		if (!element) return;

		const index = Number(
			element.getAttribute(FINAL_PREVIEW_GROUP_INDEX_ATTRIBUTE),
		);
		if (Number.isInteger(index)) {
			this.segmentSelector.selectTextGroup(index);
		}
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

	private renderGroupSettings() {
		this.groupSettingsEl.empty();
		const selectedIndex =
			this.segmentSelector.getSelectedTextGroupIndex();
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
			{ onChange: () => this.refreshPreviews() },
		);
	}

	private createTextGroups(preset?: FastGroupPreset) {
		const selected = this.segmentSelector
			.getSelectedIndices()
			.sort((a, b) => a - b);
		if (selected.length === 0) return;

		let groupStart = selected[0]!;
		let previous = selected[0]!;
		const createdGroups: TextGroup[] = [];

		for (const index of selected.slice(1)) {
			if (index !== previous + 1) {
				const group = this.addTextGroup(
					groupStart,
					previous,
					preset,
				);
				if (group) createdGroups.push(group);
				groupStart = index;
			}
			previous = index;
		}
		const group = this.addTextGroup(groupStart, previous, preset);
		if (group) createdGroups.push(group);

		this.textGroups.sort((a, b) => a.start - b.start);
		const selectedTextGroupIndex = createdGroups[0]
			? this.textGroups.indexOf(createdGroups[0])
			: null;
		this.segmentSelector.setData(
			this.text,
			this.textGroups,
			selectedTextGroupIndex,
		);
		this.renderFinalPreview();
	}

	private addTextGroup(
		firstIndex: number,
		lastIndex: number,
		preset?: FastGroupPreset,
	) {
		const segments = this.segmentSelector.getSegments();
		const first = segments[firstIndex];
		const last = segments[lastIndex];
		if (!first || !last) return null;

		const group: TextGroup = {
			start: first.start,
			end: last.end,
			appearance: preset
				? cloneTextGroupAppearance(preset.appearance)
				: createDefaultTextGroupAppearance(),
		};
		this.textGroups.push(group);
		return group;
	}

	private ungroupTextGroup() {
		const selectedIndex =
			this.segmentSelector.getSelectedTextGroupIndex();
		if (selectedIndex === null || !this.textGroups[selectedIndex]) return;

		this.textGroups.splice(selectedIndex, 1);
		this.segmentSelector.setData(this.text, this.textGroups);
		this.renderFinalPreview();
	}

	private ungroupAllTextGroups() {
		if (this.textGroups.length === 0) return;

		this.textGroups = [];
		this.segmentSelector.setData(this.text, this.textGroups);
		this.renderFinalPreview();
	}

	private clearTextGroupStyles() {
		const group = this.getSelectedTextGroup();
		if (!group) return;

		this.resetTextGroupStyles(group);
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private clearTextGroupAll() {
		const group = this.getSelectedTextGroup();
		if (!group) return;

		this.resetTextGroupStyles(group);
		group.appearance.annotate = '';
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private resetTextGroupStyles(group: TextGroup) {
		const annotate = group.appearance.annotate;
		group.appearance = createDefaultTextGroupAppearance();
		group.appearance.annotate = annotate;
	}

	private getSelectedTextGroup() {
		const selectedIndex =
			this.segmentSelector.getSelectedTextGroupIndex();
		return selectedIndex === null
			? undefined
			: this.textGroups[selectedIndex];
	}

	private updateSegmentActionButtons() {
		const hasSelectedSegments =
			this.segmentSelector.hasSelectedSegments();
		this.groupTextButton.buttonEl.disabled = !hasSelectedSegments;
		for (const button of this.fastGroupButtons) {
			button.buttonEl.disabled = !hasSelectedSegments;
		}
		const hasSelectedTextGroup =
			this.segmentSelector.getSelectedTextGroupIndex() !== null;
		this.ungroupTextButton.buttonEl.disabled = !hasSelectedTextGroup;
		this.ungroupAllTextButton.buttonEl.disabled =
			this.textGroups.length === 0;
		this.clearTextGroupStyleButton.buttonEl.disabled =
			!hasSelectedTextGroup;
		this.clearTextGroupAllButton.buttonEl.disabled =
			!hasSelectedTextGroup;
		this.updateRightColumn();
	}

	private updateRightColumn() {
		const showSelectedTextGroup =
			this.segmentSelector.getSelectedTextGroupIndex() !== null;
		const showGroupCreation =
			!showSelectedTextGroup &&
			this.segmentSelector.hasSelectedSegments();
		this.groupCreationEl.toggleClass(
			'ba-annotate-is-hidden',
			!showGroupCreation,
		);
		this.selectedTextGroupEl.toggleClass(
			'ba-annotate-is-hidden',
			!showSelectedTextGroup,
		);
		this.segmentGroupActionsEl.toggleClass(
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
