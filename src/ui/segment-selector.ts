import { TextGroup } from '../text-group/types';
import { segmentText, TextSegment } from '../text-segmentation';

export interface SegmentSelectorState {
	selectedIndices: ReadonlySet<number>;
	selectedTextGroupIndex: number | null;
}

export class SegmentSelector {
	private text = '';
	private textGroups: TextGroup[] = [];
	private segments: TextSegment[] = [];
	private readonly selectedIndices = new Set<number>();
	private readonly draggedIndices = new Set<number>();
	private selectedTextGroupIndex: number | null = null;
	private activePointerId: number | null = null;
	private dragStartIndex: number | null = null;
	private dragShouldSelect = true;

	constructor(
		private readonly containerEl: HTMLElement,
		private readonly onChange: (state: SegmentSelectorState) => void,
	) {
		containerEl.addEventListener('pointerdown', (event) => {
			this.startDrag(event);
		});
		containerEl.addEventListener('pointermove', (event) => {
			this.continueDrag(event);
		});
		containerEl.addEventListener('pointerup', (event) => {
			this.stopDrag(event.pointerId);
		});
		containerEl.addEventListener('pointercancel', (event) => {
			this.stopDrag(event.pointerId);
		});
	}

	setData(
		text: string,
		textGroups: TextGroup[],
		selectedTextGroupIndex: number | null = null,
	) {
		this.resetDrag();
		this.text = text;
		this.textGroups = textGroups;
		this.segments = segmentText(text);
		this.selectedIndices.clear();
		this.selectedTextGroupIndex =
			selectedTextGroupIndex !== null &&
			selectedTextGroupIndex >= 0 &&
			selectedTextGroupIndex < textGroups.length
				? selectedTextGroupIndex
				: null;
		this.render();
		this.notifyChange();
	}

	getSegments() {
		return this.segments;
	}

	getSelectedIndices() {
		return Array.from(this.selectedIndices);
	}

	hasSelectedSegments() {
		return this.selectedIndices.size > 0;
	}

	getSelectedTextGroupIndex() {
		return this.selectedTextGroupIndex;
	}

	clearSelection() {
		if (
			this.selectedIndices.size === 0 &&
			this.selectedTextGroupIndex === null
		) {
			return;
		}

		this.selectedIndices.clear();
		this.selectedTextGroupIndex = null;
		this.render();
		this.notifyChange();
	}

	private render() {
		this.containerEl.empty();
		let currentGroupIndex = -1;
		let groupRow: HTMLElement | null = null;

		this.segments.forEach((segment, index) => {
			const groupIndex = this.getTextGroupIndex(index);
			if (groupIndex !== currentGroupIndex) {
				currentGroupIndex = groupIndex;
				groupRow = groupIndex === -1
					? null
					: this.containerEl.createDiv(
						'ba-annotate-segment-group-row',
					);
			}

			const container = groupRow ?? this.containerEl;
			const button = container.createEl('button', {
				cls: 'ba-annotate-segment',
				text: segment.text,
			});
			button.type = 'button';
			button.dataset.segmentIndex = String(index);
			this.updateButton(button, index);
			button.addEventListener('click', (event) => {
				if (event.detail === 0) this.toggleSegment(button, index);
			});
		});
	}

	private startDrag(event: PointerEvent) {
		if (event.button !== 0) return;

		const segmentIndex = this.getSegmentIndex(event.target);
		if (segmentIndex === null) {
			event.preventDefault();
			this.clearSelection();
			return;
		}

		const groupIndex = this.getTextGroupIndex(segmentIndex);
		if (groupIndex !== -1) {
			event.preventDefault();
			this.selectTextGroup(groupIndex);
			return;
		}

		event.preventDefault();
		this.clearSelectedTextGroup();
		this.activePointerId = event.pointerId;
		this.dragStartIndex = segmentIndex;
		this.dragShouldSelect = !this.selectedIndices.has(segmentIndex);
		this.draggedIndices.clear();
		this.applyDragRange(segmentIndex);
		this.containerEl.setPointerCapture(event.pointerId);
	}

	private continueDrag(event: PointerEvent) {
		if (event.pointerId !== this.activePointerId) return;

		event.preventDefault();
		const element = this.containerEl.ownerDocument.elementFromPoint(
			event.clientX,
			event.clientY,
		);
		const segmentIndex = this.getSegmentIndex(element);
		if (
			segmentIndex !== null &&
			!this.isSegmentGrouped(segmentIndex)
		) {
			this.applyDragRange(segmentIndex);
		}
	}

	private stopDrag(pointerId: number) {
		if (pointerId !== this.activePointerId) return;

		if (this.containerEl.hasPointerCapture(pointerId)) {
			this.containerEl.releasePointerCapture(pointerId);
		}
		this.activePointerId = null;
		this.dragStartIndex = null;
		this.draggedIndices.clear();
	}

	private resetDrag() {
		if (
			this.activePointerId !== null &&
			this.containerEl.hasPointerCapture(this.activePointerId)
		) {
			this.containerEl.releasePointerCapture(this.activePointerId);
		}
		this.activePointerId = null;
		this.dragStartIndex = null;
		this.draggedIndices.clear();
	}

	private applyDragRange(endIndex: number) {
		const startIndex = this.dragStartIndex;
		if (startIndex === null) return;

		const firstIndex = Math.min(startIndex, endIndex);
		const lastIndex = Math.max(startIndex, endIndex);
		for (let index = firstIndex; index <= lastIndex; index++) {
			this.applyDragSelection(index);
		}
		this.notifyChange();
	}

	private applyDragSelection(index: number) {
		if (this.draggedIndices.has(index) || this.isSegmentGrouped(index)) return;

		const button = this.containerEl.querySelector<HTMLButtonElement>(
			`[data-segment-index="${index}"]`,
		);
		if (!button) return;

		this.draggedIndices.add(index);
		if (this.dragShouldSelect) {
			this.selectedIndices.add(index);
		} else {
			this.selectedIndices.delete(index);
		}
		this.updateButton(button, index);
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
		this.updateButton(button, index);
		this.notifyChange();
	}

	selectTextGroup(index: number) {
		if (index < 0 || index >= this.textGroups.length) return;

		this.selectedIndices.clear();
		this.selectedTextGroupIndex =
			this.selectedTextGroupIndex === index ? null : index;
		this.render();
		this.notifyChange();
	}

	private clearSelectedTextGroup() {
		if (this.selectedTextGroupIndex === null) return;

		this.selectedTextGroupIndex = null;
		this.updateAllButtons();
	}

	private getSegmentIndex(target: EventTarget | null) {
		if (!(target instanceof Element)) return null;

		const button = target.closest<HTMLButtonElement>('.ba-annotate-segment');
		if (!button || !this.containerEl.contains(button)) return null;

		const index = Number(button.dataset.segmentIndex);
		return Number.isInteger(index) ? index : null;
	}

	private updateAllButtons() {
		this.containerEl
			.querySelectorAll<HTMLButtonElement>('.ba-annotate-segment')
			.forEach((button) => {
				const index = Number(button.dataset.segmentIndex);
				if (Number.isInteger(index)) this.updateButton(button, index);
			});
	}

	private updateButton(button: HTMLButtonElement, index: number) {
		const groupIndex = this.getTextGroupIndex(index);
		const isSelected = this.selectedIndices.has(index);
		button.toggleClass('is-grouped', groupIndex !== -1);
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

	private isSegmentGrouped(index: number) {
		return this.getTextGroupIndex(index) !== -1;
	}

	private getTextGroupIndex(index: number) {
		const segment = this.segments[index];
		if (!segment) return -1;

		return this.textGroups.findIndex(
			(group) =>
				segment.start >= group.start && segment.end <= group.end,
		);
	}

	private notifyChange() {
		this.onChange({
			selectedIndices: this.selectedIndices,
			selectedTextGroupIndex: this.selectedTextGroupIndex,
		});
	}
}
