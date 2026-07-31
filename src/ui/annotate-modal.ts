import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	Setting,
} from 'obsidian';
import {
	DEFAULT_BUTTON_TEXT_COLOR,
	DEFAULT_GROUP_COLOR,
	FastGroupPreset,
} from '../fast-group';
import {
	segmentText,
	TextGroup,
	TextSegment,
} from '../text-segmentation';
import {
	appendAnnotatedText,
	createTextGroupElement,
} from '../text-group-renderer';
import { CreateAnnotateModal } from './create-annotate-modal';

const DEFAULT_COLOR = DEFAULT_GROUP_COLOR;

export interface EditAnnotateModalOptions {
	initialText?: string;
	initialTextGroups?: TextGroup[];
	fastGroupPresets?: FastGroupPreset[];
	onSave: (text: string, textGroups: TextGroup[]) => void;
	onDelete?: () => void;
}

export class EditAnnotateModal extends Modal {
	private text: string;
	private readonly selectedIndices = new Set<number>();
	private readonly draggedIndices = new Set<number>();
	private textGroups: TextGroup[];
	private segments: TextSegment[] = [];
	private segmentsEl!: HTMLElement;
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
	private activePointerId: number | null = null;
	private dragStartIndex: number | null = null;
	private dragShouldSelect = true;
	private selectedTextGroupIndex: number | null = null;

	constructor(
		app: App,
		private readonly options: EditAnnotateModalOptions,
	) {
		super(app);
		this.text = options.initialText ?? '';
		this.textGroups = [];
		for (const group of options.initialTextGroups ?? []) {
			const textColor = this.normalizeColor(
				group.textColor,
				DEFAULT_COLOR,
			);
			this.textGroups.push({
				...group,
				textColor,
				textBackgroundColor: this.normalizeOptionalColor(
					group.textBackgroundColor,
				),
				underline: group.underline ?? false,
				underlineColor: this.normalizeColor(
					group.underlineColor,
					textColor,
				),
				annotate: group.annotate ?? '',
				annotateColor: this.normalizeColor(
					group.annotateColor,
					DEFAULT_COLOR,
				),
				annotateVisible: group.annotateVisible ?? true,
				annotatePosition:
					group.annotatePosition === 'over' ? 'over' : 'under',
				annotateCompact: group.annotateCompact ?? true,
			});
		}
		if (this.textGroups.length > 0) this.selectedTextGroupIndex = 0;
	}

	onOpen() {
		this.setTitle('Edit annotate');
		this.modalEl.addClass('ba-annotate-modal');
		const layout = this.contentEl.createDiv('ba-annotate-layout');
		const finalPreviewSection = layout.createDiv(
			'ba-annotate-final-preview-section',
		);
		const finalPreviewHeader = finalPreviewSection.createDiv(
			'ba-annotate-section-header',
		);
		finalPreviewHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Final preview',
		});
		new ButtonComponent(finalPreviewHeader)
			.setButtonText('Modify text')
			.onClick(() => this.modifyText());
		this.finalPreviewEl = finalPreviewSection.createDiv(
			'ba-annotate-final-preview',
		);
		const segmentsColumn = layout.createDiv('ba-annotate-column');
		const groupColumn = layout.createDiv('ba-annotate-column');

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
			const buttonColor = preset.buttonColor ?? DEFAULT_COLOR;
			button.buttonEl.addClass('ba-annotate-fast-group-button');
			button.buttonEl.setCssProps({
				'--ba-fast-group-button-color': buttonColor,
				'--ba-fast-group-button-text-color':
					preset.buttonTextColor ?? DEFAULT_BUTTON_TEXT_COLOR,
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
			.setWarning()
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
		this.segmentsEl.addEventListener('pointerdown', (event) => {
			this.startSegmentDrag(event);
		});
		this.segmentsEl.addEventListener('pointermove', (event) => {
			this.continueSegmentDrag(event);
		});
		this.segmentsEl.addEventListener('pointerup', (event) => {
			this.stopSegmentDrag(event.pointerId);
		});
		this.segmentsEl.addEventListener('pointercancel', (event) => {
			this.stopSegmentDrag(event.pointerId);
		});

		this.renderSegments();
		this.renderSelectedTextGroup();
		this.renderFinalPreview();

		const actions = this.contentEl.createDiv('ba-annotate-actions');
		if (this.options.onDelete) {
			new ButtonComponent(actions)
				.setButtonText('Delete')
				.setWarning()
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

	private renderSegments() {
		this.segmentsEl.empty();
		this.segments = segmentText(this.text);
		let currentGroupIndex = -1;
		let groupRow: HTMLElement | null = null;

		this.segments.forEach((segment, index) => {
			const groupIndex = this.getTextGroupIndex(index);
			if (groupIndex !== currentGroupIndex) {
				currentGroupIndex = groupIndex;
				groupRow = groupIndex === -1
					? null
					: this.segmentsEl.createDiv(
						'ba-annotate-segment-group-row',
					);
			}

			const container = groupRow ?? this.segmentsEl;
			const button = container.createEl('button', {
				cls: 'ba-annotate-segment',
				text: segment.text,
			});
			button.type = 'button';
			button.dataset.segmentIndex = String(index);
			this.updateSegmentButton(button, index);
			button.addEventListener('click', (event) => {
				// 鼠标和触摸操作已由 pointer 事件处理；detail 为 0 表示键盘点击。
				if (event.detail === 0) this.toggleSegment(button, index);
			});
		});

		this.updateSegmentActionButtons();
	}

	private modifyText() {
		new Notice('Modifying the text will delete all existing groups.');
		new CreateAnnotateModal(this.app, {
			initialText: this.text,
			onSave: (text) => {
				this.text = text;
				this.selectedIndices.clear();
				this.textGroups = [];
				this.selectedTextGroupIndex = null;
				this.renderSegments();
				this.renderSelectedTextGroup();
				this.renderFinalPreview();
				new Notice('All text groups were deleted.');
			},
		}).open();
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

	private renderFinalPreview() {
		this.finalPreviewEl.empty();
		appendAnnotatedText(
			this.finalPreviewEl,
			this.text,
			this.textGroups,
		);
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

		this.groupSettingsEl.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Text',
		});
		new Setting(this.groupSettingsEl)
			.setName('Text color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(group.textColor ?? DEFAULT_COLOR)
					.onChange((value) => {
						group.textColor = value;
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Text background')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(
						group.textBackgroundColor ?? DEFAULT_COLOR,
					)
					.onChange((value) => {
						group.textBackgroundColor = value;
						this.refreshPreviews();
					});
			})
			.addExtraButton((button) => {
				button.extraSettingsEl.setAttribute(
					'aria-label',
					'Clear background',
				);
				button
					.setIcon('x')
					.onClick(() => {
						group.textBackgroundColor = undefined;
						this.refreshPreviews();
						this.renderGroupSettings();
					});
			});

		this.groupSettingsEl.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Underline',
		});
		new Setting(this.groupSettingsEl)
			.setName('Show underline')
			.addToggle((toggle) => {
				toggle
					.setValue(group.underline ?? false)
					.onChange((value) => {
						group.underline = value;
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Underline color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(
						group.underlineColor ?? DEFAULT_COLOR,
					)
					.onChange((value) => {
						group.underlineColor = value;
						this.refreshPreviews();
					});
			});

		this.groupSettingsEl.createDiv({
			cls: 'ba-annotate-settings-heading',
			text: 'Annotate',
		});
		new Setting(this.groupSettingsEl)
			.setName('Content')
			.addText((input) => {
				input
					.setPlaceholder('Enter annotate text')
					.setValue(group.annotate ?? '')
					.onChange((value) => {
						group.annotate = value;
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Annotate color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(group.annotateColor ?? DEFAULT_COLOR)
					.onChange((value) => {
						group.annotateColor = value;
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Show annotate')
			.addToggle((toggle) => {
				toggle
					.setValue(group.annotateVisible ?? true)
					.onChange((value) => {
						group.annotateVisible = value;
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Display below')
			.addToggle((toggle) => {
				toggle
					.setValue(group.annotatePosition === 'under')
					.onChange((value) => {
						group.annotatePosition = value ? 'under' : 'over';
						this.refreshPreviews();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Compact layout')
			.addToggle((toggle) => {
				toggle
					.setValue(group.annotateCompact ?? true)
					.onChange((value) => {
						group.annotateCompact = value;
						this.refreshPreviews();
					});
			});
	}

	private createTextGroups(preset?: FastGroupPreset) {
		const selected = Array.from(this.selectedIndices)
			.filter((index) => !this.isSegmentGrouped(index))
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
		this.selectedIndices.clear();
		this.selectedTextGroupIndex = createdGroups[0]
			? this.textGroups.indexOf(createdGroups[0])
			: null;
		this.renderSegments();
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private addTextGroup(
		firstIndex: number,
		lastIndex: number,
		preset?: FastGroupPreset,
	) {
		const first = this.segments[firstIndex];
		const last = this.segments[lastIndex];
		if (!first || !last) return null;

		const group: TextGroup = {
			start: first.start,
			end: last.end,
			textColor: preset?.textColor ?? DEFAULT_COLOR,
			textBackgroundColor: preset?.textBackgroundColor,
			underline: preset?.underline ?? false,
			underlineColor: preset?.underlineColor ?? DEFAULT_COLOR,
			annotate: preset?.annotate ?? '',
			annotateColor: preset?.annotateColor ?? DEFAULT_COLOR,
			annotateVisible: preset?.annotateVisible ?? true,
			annotatePosition: preset?.annotatePosition ?? 'under',
			annotateCompact: preset?.annotateCompact ?? true,
		};
		this.textGroups.push(group);
		return group;
	}

	private ungroupTextGroup() {
		const selectedIndex = this.selectedTextGroupIndex;
		if (selectedIndex === null || !this.textGroups[selectedIndex]) return;

		this.textGroups.splice(selectedIndex, 1);
		this.selectedTextGroupIndex = null;
		this.renderSegments();
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private ungroupAllTextGroups() {
		if (this.textGroups.length === 0) return;

		this.textGroups = [];
		this.selectedIndices.clear();
		this.selectedTextGroupIndex = null;
		this.renderSegments();
		this.renderSelectedTextGroup();
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
		group.annotate = '';
		this.renderSelectedTextGroup();
		this.renderFinalPreview();
	}

	private resetTextGroupStyles(group: TextGroup) {
		group.textColor = DEFAULT_COLOR;
		group.textBackgroundColor = undefined;
		group.underline = false;
		group.underlineColor = DEFAULT_COLOR;
		group.annotateColor = DEFAULT_COLOR;
		group.annotateVisible = true;
		group.annotatePosition = 'under';
		group.annotateCompact = true;
	}

	private getSelectedTextGroup() {
		const selectedIndex = this.selectedTextGroupIndex;
		return selectedIndex === null
			? undefined
			: this.textGroups[selectedIndex];
	}

	private startSegmentDrag(event: PointerEvent) {
		if (event.button !== 0) return;

		const segment = this.getSegmentFromElement(event.target);
		if (!segment) {
			event.preventDefault();
			this.clearSegmentSelection();
			return;
		}

		const groupIndex = this.getTextGroupIndex(segment.index);
		if (groupIndex !== -1) {
			event.preventDefault();
			this.selectTextGroup(groupIndex);
			return;
		}

		event.preventDefault();
		this.clearSelectedTextGroup();
		this.activePointerId = event.pointerId;
		this.dragStartIndex = segment.index;
		this.dragShouldSelect = !this.selectedIndices.has(segment.index);
		this.draggedIndices.clear();
		this.applyDragRangeSelection(segment.index);
		this.segmentsEl.setPointerCapture(event.pointerId);
	}

	private continueSegmentDrag(event: PointerEvent) {
		if (event.pointerId !== this.activePointerId) return;

		event.preventDefault();
		const element = this.segmentsEl.ownerDocument.elementFromPoint(
			event.clientX,
			event.clientY,
		);
		const segment = this.getSegmentFromElement(element);
		if (
			segment &&
			!this.isSegmentGrouped(segment.index)
		) {
			this.applyDragRangeSelection(segment.index);
		}
	}

	private stopSegmentDrag(pointerId: number) {
		if (pointerId !== this.activePointerId) return;

		if (this.segmentsEl.hasPointerCapture(pointerId)) {
			this.segmentsEl.releasePointerCapture(pointerId);
		}
		this.activePointerId = null;
		this.dragStartIndex = null;
		this.draggedIndices.clear();
	}

	private applyDragRangeSelection(endIndex: number) {
		const startIndex = this.dragStartIndex;
		if (startIndex === null) return;

		const firstIndex = Math.min(startIndex, endIndex);
		const lastIndex = Math.max(startIndex, endIndex);
		for (let index = firstIndex; index <= lastIndex; index++) {
			this.applyDragSelection(index);
		}
		this.updateSegmentActionButtons();
	}

	private applyDragSelection(index: number) {
		if (this.draggedIndices.has(index) || this.isSegmentGrouped(index)) return;

		const button = this.segmentsEl.querySelector<HTMLButtonElement>(
			`[data-segment-index="${index}"]`,
		);
		if (!button) return;

		this.draggedIndices.add(index);
		if (this.dragShouldSelect) {
			this.selectedIndices.add(index);
		} else {
			this.selectedIndices.delete(index);
		}
		this.updateSegmentButton(button, index);
	}

	private toggleSegment(button: HTMLButtonElement, index: number) {
		const groupIndex = this.getTextGroupIndex(index);
		if (groupIndex !== -1) {
			this.selectTextGroup(groupIndex);
			return;
		}
		this.clearSelectedTextGroup();

		if (this.selectedIndices.has(index)) {
			this.selectedIndices.delete(index);
		} else {
			this.selectedIndices.add(index);
		}
		this.updateSegmentButton(button, index);
		this.updateSegmentActionButtons();
	}

	private getSegmentFromElement(target: EventTarget | null) {
		if (!(target instanceof Element)) return null;

		const button = target.closest<HTMLButtonElement>('.ba-annotate-segment');
		if (!button || !this.segmentsEl.contains(button)) return null;

		const index = Number(button.dataset.segmentIndex);
		if (!Number.isInteger(index)) return null;

		return { button, index };
	}

	private updateSegmentButton(button: HTMLButtonElement, index: number) {
		const groupIndex = this.getTextGroupIndex(index);
		const isGrouped = groupIndex !== -1;
		const isSelected = this.selectedIndices.has(index);
		button.toggleClass('is-grouped', isGrouped);
		button.toggleClass('is-selected', isSelected);
		button.toggleClass(
			'is-active-text-group',
			groupIndex === this.selectedTextGroupIndex,
		);
		button.setAttribute(
			'aria-pressed',
			String(
				isSelected || groupIndex === this.selectedTextGroupIndex,
			),
		);
	}

	private updateSegmentActionButtons() {
		const hasSelectedSegments = this.selectedIndices.size > 0;
		this.groupTextButton.buttonEl.disabled = !hasSelectedSegments;
		for (const button of this.fastGroupButtons) {
			button.buttonEl.disabled = !hasSelectedSegments;
		}
		const hasSelectedTextGroup = this.selectedTextGroupIndex !== null;
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
		const showSelectedTextGroup = this.selectedTextGroupIndex !== null;
		const showGroupCreation =
			!showSelectedTextGroup && this.selectedIndices.size > 0;
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

	private isSegmentGrouped(index: number) {
		return this.getTextGroupIndex(index) !== -1;
	}

	private getTextGroupIndex(index: number) {
		const segment = this.segments[index];
		if (!segment) return -1;

		return this.textGroups.findIndex(
			(group) => segment.start >= group.start && segment.end <= group.end,
		);
	}

	private selectTextGroup(index: number) {
		this.selectedIndices.clear();
		this.selectedTextGroupIndex =
			this.selectedTextGroupIndex === index ? null : index;
		this.renderSegments();
		this.renderSelectedTextGroup();
	}

	private clearSelectedTextGroup() {
		if (this.selectedTextGroupIndex === null) return;

		this.selectedTextGroupIndex = null;
		this.updateSegmentActionButtons();
		this.segmentsEl
			.querySelectorAll<HTMLButtonElement>('.ba-annotate-segment')
			.forEach((button) => {
				const index = Number(button.dataset.segmentIndex);
				if (Number.isInteger(index)) {
					this.updateSegmentButton(button, index);
				}
			});
		this.renderSelectedTextGroup();
	}

	private clearSegmentSelection() {
		if (
			this.selectedIndices.size === 0 &&
			this.selectedTextGroupIndex === null
		) {
			return;
		}

		this.selectedIndices.clear();
		this.selectedTextGroupIndex = null;
		this.renderSegments();
		this.renderSelectedTextGroup();
	}

	private normalizeColor(color: string | undefined, fallback: string) {
		return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color! : fallback;
	}

	private normalizeOptionalColor(color: string | undefined) {
		return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : undefined;
	}

	private save() {
		if (!this.text.trim()) {
			new Notice('Enter some text first.');
			return;
		}

		this.options.onSave(this.text, this.textGroups);
		this.close();
	}

	private delete() {
		this.options.onDelete?.();
		this.close();
	}
}
