import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	TextAreaComponent,
} from 'obsidian';
import { segmentText } from '../text-segmentation';

export interface AnnotateModalOptions {
	initialText?: string;
	onSave: (text: string) => void;
	onDelete?: () => void;
}

export class AnnotateModal extends Modal {
	private text: string;
	private readonly selectedIndices: Set<number>;
	private readonly draggedIndices = new Set<number>();
	private segmentsEl!: HTMLElement;
	private activePointerId: number | null = null;
	private dragShouldSelect = true;

	constructor(
		app: App,
		private readonly options: AnnotateModalOptions,
	) {
		super(app);
		this.text = options.initialText ?? '';
		this.selectedIndices = new Set();
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
				this.renderSegments();
			});

		textArea.inputEl.rows = 5;
		textArea.inputEl.addClass('ba-annotate-textarea');

		this.contentEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Segments',
		});
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
		this.renderSegments();

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

		segmentText(this.text).forEach((segment, index) => {
			const button = this.segmentsEl.createEl('button', {
				cls: 'ba-annotate-segment',
				text: segment,
			});
			button.type = 'button';
			button.dataset.segmentIndex = String(index);
			this.updateSegmentButton(button, index);
			button.addEventListener('click', (event) => {
				// 鼠标和触摸操作已由 pointer 事件处理；detail 为 0 表示键盘点击。
				if (event.detail === 0) this.toggleSegment(button, index);
			});
		});
	}

	private startSegmentDrag(event: PointerEvent) {
		if (event.button !== 0) return;

		const segment = this.getSegmentFromElement(event.target);
		if (!segment) return;

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
		if (segment) this.applyDragSelection(segment.button, segment.index);
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
		if (this.draggedIndices.has(index)) return;

		this.draggedIndices.add(index);
		if (this.dragShouldSelect) {
			this.selectedIndices.add(index);
		} else {
			this.selectedIndices.delete(index);
		}
		this.updateSegmentButton(button, index);
	}

	private toggleSegment(button: HTMLButtonElement, index: number) {
		if (this.selectedIndices.has(index)) {
			this.selectedIndices.delete(index);
		} else {
			this.selectedIndices.add(index);
		}
		this.updateSegmentButton(button, index);
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
		const isSelected = this.selectedIndices.has(index);
		button.toggleClass('is-selected', isSelected);
		button.setAttribute('aria-pressed', String(isSelected));
	}

	private save() {
		const text = this.text.trim();
		if (!text) {
			new Notice('Enter some text first.');
			return;
		}

		this.options.onSave(text);
		this.close();
	}

	private delete() {
		this.options.onDelete?.();
		this.close();
	}
}
