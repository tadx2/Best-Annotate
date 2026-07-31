import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	Setting,
	TextAreaComponent,
} from 'obsidian';
import {
	segmentText,
	TextGroup,
	TextSegment,
} from '../text-segmentation';

const DEFAULT_COLOR = '#000000';
const ANNOTATE_POSITION_ATTRIBUTE = 'data-ba-annotate-position';
const ANNOTATE_VISIBLE_ATTRIBUTE = 'data-ba-annotate-visible';
const ANNOTATE_COMPACT_ATTRIBUTE = 'data-ba-annotate-compact';

export interface AnnotateModalOptions {
	initialText?: string;
	initialTextGroups?: TextGroup[];
	onSave: (text: string, textGroups: TextGroup[]) => void;
	onDelete?: () => void;
}

export class AnnotateModal extends Modal {
	private text: string;
	private readonly selectedIndices = new Set<number>();
	private readonly draggedIndices = new Set<number>();
	private textGroups: TextGroup[];
	private segments: TextSegment[] = [];
	private segmentsEl!: HTMLElement;
	private textGroupPreviewEl!: HTMLElement;
	private groupSettingsEl!: HTMLElement;
	private finalPreviewEl!: HTMLElement;
	private createTextGroupButton!: ButtonComponent;
	private activePointerId: number | null = null;
	private dragShouldSelect = true;
	private selectedTextGroupIndex: number | null = null;

	constructor(
		app: App,
		private readonly options: AnnotateModalOptions,
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
		this.setTitle(this.options.onDelete ? 'Edit annotate' : 'Add annotate');
		this.modalEl.addClass('ba-annotate-modal');
		const layout = this.contentEl.createDiv('ba-annotate-layout');
		const finalPreviewSection = layout.createDiv(
			'ba-annotate-final-preview-section',
		);
		finalPreviewSection.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Final preview',
		});
		this.finalPreviewEl = finalPreviewSection.createDiv(
			'ba-annotate-final-preview',
		);
		const textColumn = layout.createDiv('ba-annotate-column');
		const groupColumn = layout.createDiv('ba-annotate-column');

		groupColumn.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text group preview',
		});
		this.textGroupPreviewEl = groupColumn.createDiv(
			'ba-annotate-text-group-preview',
		);

		groupColumn.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text group settings',
		});
		this.groupSettingsEl = groupColumn.createDiv(
			'ba-annotate-group-settings',
		);

		textColumn.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text',
		});
		const textArea = new TextAreaComponent(textColumn)
			.setPlaceholder('Enter annotate text')
			.setValue(this.text)
			.onChange((value) => {
				this.text = value;
				this.selectedIndices.clear();
				this.textGroups = [];
				this.selectedTextGroupIndex = null;
				this.renderSegments();
				this.renderSelectedTextGroup();
				this.renderFinalPreview();
			});

		textArea.inputEl.rows = 5;
		textArea.inputEl.addClass('ba-annotate-textarea');

		const segmentsHeader = textColumn.createDiv(
			'ba-annotate-section-header',
		);
		segmentsHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Segments',
		});
		this.createTextGroupButton = new ButtonComponent(segmentsHeader)
			.setButtonText('Create text group')
			.onClick(() => this.createTextGroups());

		this.segmentsEl = textColumn.createDiv('ba-annotate-segments');
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

		textArea.inputEl.focus();
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

		this.updateCreateTextGroupButton();
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
		this.appendTextGroup(this.textGroupPreviewEl, group, groupText);
	}

	private renderFinalPreview() {
		this.finalPreviewEl.empty();
		const groups = [...this.textGroups].sort((a, b) => a.start - b.start);
		let cursor = 0;

		for (const group of groups) {
			if (
				group.start < cursor ||
				group.start < 0 ||
				group.end > this.text.length
			) {
				continue;
			}

			this.appendPreviewText(
				this.finalPreviewEl,
				this.text.slice(cursor, group.start),
			);
			this.appendTextGroup(
				this.finalPreviewEl,
				group,
				this.text.slice(group.start, group.end),
			);
			cursor = group.end;
		}

		this.appendPreviewText(
			this.finalPreviewEl,
			this.text.slice(cursor),
		);
	}

	private appendTextGroup(
		container: HTMLElement,
		group: TextGroup,
		text: string,
	) {
		const ruby = container.createEl('ruby', { cls: 'ba-text-group' });
		ruby.setCssProps({
			'--ba-text-color': group.textColor ?? '',
			'--ba-text-background-color':
				group.textBackgroundColor ?? 'transparent',
			'--ba-underline-color': group.underlineColor ?? '',
			'--ba-annotate-color': group.annotateColor ?? '',
		});
		ruby.setAttribute(
			ANNOTATE_POSITION_ATTRIBUTE,
			group.annotatePosition ?? 'under',
		);
		ruby.setAttribute(
			ANNOTATE_VISIBLE_ATTRIBUTE,
			String(group.annotateVisible ?? true),
		);
		ruby.setAttribute(
			ANNOTATE_COMPACT_ATTRIBUTE,
			String(group.annotateCompact ?? true),
		);
		const base = ruby.createSpan('ba-text-group-base');
		if (group.underline) {
			const underline = base.createEl('u');
			this.appendPreviewText(underline, text);
		} else {
			this.appendPreviewText(base, text);
		}
		if (group.annotate) ruby.createEl('rt', { text: group.annotate });
	}

	private appendPreviewText(container: HTMLElement, text: string) {
		text.split(/\r?\n/).forEach((line, index) => {
			if (index > 0) container.createEl('br');
			container.appendText(line);
		});
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

	private createTextGroups() {
		const selected = Array.from(this.selectedIndices)
			.filter((index) => !this.isSegmentGrouped(index))
			.sort((a, b) => a - b);
		if (selected.length === 0) return;

		let groupStart = selected[0]!;
		let previous = selected[0]!;
		const createdGroups: TextGroup[] = [];

		for (const index of selected.slice(1)) {
			if (index !== previous + 1) {
				const group = this.addTextGroup(groupStart, previous);
				if (group) createdGroups.push(group);
				groupStart = index;
			}
			previous = index;
		}
		const group = this.addTextGroup(groupStart, previous);
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

	private addTextGroup(firstIndex: number, lastIndex: number) {
		const first = this.segments[firstIndex];
		const last = this.segments[lastIndex];
		if (!first || !last) return null;

		const group: TextGroup = {
			start: first.start,
			end: last.end,
			textColor: DEFAULT_COLOR,
			textBackgroundColor: undefined,
			underline: false,
			underlineColor: DEFAULT_COLOR,
			annotate: '',
			annotateColor: DEFAULT_COLOR,
			annotateVisible: true,
			annotatePosition: 'under',
			annotateCompact: true,
		};
		this.textGroups.push(group);
		return group;
	}

	private startSegmentDrag(event: PointerEvent) {
		if (event.button !== 0) return;

		const segment = this.getSegmentFromElement(event.target);
		if (!segment) return;

		const groupIndex = this.getTextGroupIndex(segment.index);
		if (groupIndex !== -1) {
			event.preventDefault();
			this.selectTextGroup(groupIndex);
			return;
		}

		event.preventDefault();
		this.clearSelectedTextGroup();
		this.activePointerId = event.pointerId;
		this.dragShouldSelect = !this.selectedIndices.has(segment.index);
		this.draggedIndices.clear();
		this.applyDragSelection(segment.button, segment.index);
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
			this.applyDragSelection(segment.button, segment.index);
		}
	}

	private stopSegmentDrag(pointerId: number) {
		if (pointerId !== this.activePointerId) return;

		if (this.segmentsEl.hasPointerCapture(pointerId)) {
			this.segmentsEl.releasePointerCapture(pointerId);
		}
		this.activePointerId = null;
		this.draggedIndices.clear();
	}

	private applyDragSelection(button: HTMLButtonElement, index: number) {
		if (this.draggedIndices.has(index) || this.isSegmentGrouped(index)) return;

		this.draggedIndices.add(index);
		if (this.dragShouldSelect) {
			this.selectedIndices.add(index);
		} else {
			this.selectedIndices.delete(index);
		}
		this.updateSegmentButton(button, index);
		this.updateCreateTextGroupButton();
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
		this.updateCreateTextGroupButton();
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

	private updateCreateTextGroupButton() {
		this.createTextGroupButton.buttonEl.disabled =
			this.selectedIndices.size === 0;
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
