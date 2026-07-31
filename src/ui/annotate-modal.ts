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

const TEXT_GROUP_COLORS = [
	'#e57373',
	'#ba68c8',
	'#7986cb',
	'#4fc3f7',
	'#4db6ac',
	'#81c784',
	'#ffb74d',
	'#f06292',
];
const RT_POSITION_ATTRIBUTE = 'data-ba-rt-position';

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
	private groupSettingsEl!: HTMLElement;
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
			this.textGroups.push({
				...group,
				color: this.normalizeTextGroupColor(group.color),
				underline: group.underline ?? false,
				rt: group.rt ?? '',
				rtPosition: group.rtPosition === 'under' ? 'under' : 'over',
			});
		}
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
				this.selectedTextGroupIndex = null;
				this.renderSegments();
				this.renderTextGroups();
				this.renderGroupSettings();
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
		this.contentEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Group settings',
		});
		this.groupSettingsEl = this.contentEl.createDiv(
			'ba-annotate-group-settings',
		);

		this.renderSegments();
		this.renderTextGroups();
		this.renderGroupSettings();

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

		this.textGroups.forEach((group, index) => {
			const groupEl = this.textGroupsEl.createEl('button', {
				cls: 'ba-annotate-text-group',
			});
			groupEl.type = 'button';
			groupEl.setCssProps({ '--ba-text-group-color': group.color ?? '' });
			groupEl.toggleClass(
				'is-active',
				index === this.selectedTextGroupIndex,
			);
			groupEl.toggleClass('is-underlined', group.underline ?? false);
			groupEl.setAttribute(
				'aria-pressed',
				String(index === this.selectedTextGroupIndex),
			);
			const ruby = groupEl.createEl('ruby');
			ruby.setAttribute(
				RT_POSITION_ATTRIBUTE,
				group.rtPosition ?? 'over',
			);
			const groupText = this.text.slice(group.start, group.end);
			if (group.underline) {
				ruby.createEl('u', { text: groupText });
			} else {
				ruby.appendText(groupText);
			}
			if (group.rt) ruby.createEl('rt', { text: group.rt });
			groupEl.addEventListener('click', () => {
				this.selectTextGroup(index);
			});
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

		new Setting(this.groupSettingsEl)
			.setName('Color')
			.addColorPicker((colorPicker) => {
				colorPicker
					.setValue(group.color ?? TEXT_GROUP_COLORS[0]!)
					.onChange((value) => {
						group.color = value;
						this.renderSegments();
						this.renderTextGroups();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Underline')
			.addToggle((toggle) => {
				toggle
					.setValue(group.underline ?? false)
					.onChange((value) => {
						group.underline = value;
						this.renderTextGroups();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('RT')
			.addText((input) => {
				input
					.setPlaceholder('Enter ruby text')
					.setValue(group.rt ?? '')
					.onChange((value) => {
						group.rt = value;
						this.renderTextGroups();
					});
			});

		new Setting(this.groupSettingsEl)
			.setName('Annotation position')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('over', 'Above')
					.addOption('under', 'Below')
					.setValue(group.rtPosition ?? 'over')
					.onChange((value) => {
						group.rtPosition = value === 'under' ? 'under' : 'over';
						this.renderTextGroups();
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
		this.selectedTextGroupIndex = null;
		this.renderSegments();
		this.renderTextGroups();
		this.renderGroupSettings();
	}

	private addTextGroup(firstIndex: number, lastIndex: number) {
		const first = this.segments[firstIndex];
		const last = this.segments[lastIndex];
		if (!first || !last) return;

		this.textGroups.push({
			start: first.start,
			end: last.end,
			color: this.createRandomGroupColor(),
			underline: false,
			rt: '',
			rtPosition: 'over',
		});
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
		const group = this.textGroups[groupIndex];
		const isGrouped = groupIndex !== -1;
		const isSelected = this.selectedIndices.has(index);
		button.setCssProps({ '--ba-text-group-color': group?.color ?? '' });
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
		this.selectedTextGroupIndex =
			this.selectedTextGroupIndex === index ? null : index;
		this.renderSegments();
		this.renderTextGroups();
		this.renderGroupSettings();
	}

	private createRandomGroupColor() {
		const usedColors = new Set(this.textGroups.map((group) => group.color));
		const availableColors = TEXT_GROUP_COLORS.filter(
			(color) => !usedColors.has(color),
		);
		const colors = availableColors.length > 0
			? availableColors
			: TEXT_GROUP_COLORS;
		const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

		return colors[randomValue % colors.length] ?? TEXT_GROUP_COLORS[0]!;
	}

	private normalizeTextGroupColor(color: string | undefined) {
		return /^#[0-9a-f]{6}$/i.test(color ?? '')
			? color!
			: this.createRandomGroupColor();
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
