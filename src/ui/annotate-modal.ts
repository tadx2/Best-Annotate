import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	TextAreaComponent,
} from 'obsidian';
import {
	segmentText,
	TextGroup,
	TextSegment,
} from '../text-segmentation';

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
	private textGroupsEl!: HTMLElement;
	private createTextGroupButton!: ButtonComponent;
	private activePointerId: number | null = null;
	private dragShouldSelect = true;

	constructor(
		app: App,
		private readonly options: AnnotateModalOptions,
	) {
		super(app);
		this.text = options.initialText ?? '';
		this.textGroups = [...(options.initialTextGroups ?? [])];
	}

	onOpen() {
		this.setTitle(this.options.onDelete ? 'Edit annotate' : 'Add annotate');

		this.contentEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text',
		});
		const textArea = new TextAreaComponent(this.contentEl)
			.setPlaceholder('Enter annotate text')
			.setValue(this.text)
			.onChange((value) => {
				this.text = value;
				this.selectedIndices.clear();
				this.textGroups = [];
				this.renderSegments();
				this.renderTextGroups();
			});

		textArea.inputEl.rows = 5;
		textArea.inputEl.addClass('ba-annotate-textarea');

		const segmentsHeader = this.contentEl.createDiv(
			'ba-annotate-section-header',
		);
		segmentsHeader.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Segments',
		});
		this.createTextGroupButton = new ButtonComponent(segmentsHeader)
			.setButtonText('Create text group')
			.onClick(() => this.createTextGroups());

		this.segmentsEl = this.contentEl.createDiv('ba-annotate-segments');
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

		this.contentEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text Group',
		});
		this.textGroupsEl = this.contentEl.createDiv(
			'ba-annotate-text-groups',
		);

		this.renderSegments();
		this.renderTextGroups();

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

		this.segments.forEach((segment, index) => {
			const button = this.segmentsEl.createEl('button', {
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

	private renderTextGroups() {
		this.textGroupsEl.empty();

		this.textGroups.forEach((group) => {
			const groupEl = this.textGroupsEl.createDiv(
				'ba-annotate-text-group',
			);
			groupEl.createEl('ruby', {
				text: this.text.slice(group.start, group.end),
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

		for (const index of selected.slice(1)) {
			if (index !== previous + 1) {
				this.addTextGroup(groupStart, previous);
				groupStart = index;
			}
			previous = index;
		}
		this.addTextGroup(groupStart, previous);

		this.textGroups.sort((a, b) => a.start - b.start);
		this.selectedIndices.clear();
		this.renderSegments();
		this.renderTextGroups();
	}

	private addTextGroup(firstIndex: number, lastIndex: number) {
		const first = this.segments[firstIndex];
		const last = this.segments[lastIndex];
		if (!first || !last) return;

		this.textGroups.push({ start: first.start, end: last.end });
	}

	private startSegmentDrag(event: PointerEvent) {
		if (event.button !== 0) return;

		const segment = this.getSegmentFromElement(event.target);
		if (!segment || this.isSegmentGrouped(segment.index)) return;

		event.preventDefault();
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
		if (this.isSegmentGrouped(index)) return;

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
		const isGrouped = this.isSegmentGrouped(index);
		const isSelected = this.selectedIndices.has(index);
		button.disabled = isGrouped;
		button.toggleClass('is-grouped', isGrouped);
		button.toggleClass('is-selected', isSelected);
		button.setAttribute('aria-pressed', String(isSelected));
	}

	private updateCreateTextGroupButton() {
		this.createTextGroupButton.buttonEl.disabled =
			this.selectedIndices.size === 0;
	}

	private isSegmentGrouped(index: number) {
		const segment = this.segments[index];
		if (!segment) return false;

		return this.textGroups.some(
			(group) => segment.start >= group.start && segment.end <= group.end,
		);
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
