import { ButtonComponent, setIcon } from 'obsidian';
import { FastGroupPreset } from '../fast-group';

export type PreviewSelectionState =
	| { type: 'none' }
	| { type: 'range'; start: number; end: number }
	| { type: 'group'; index: number };

export interface ButtonsSetCallbacks {
	onCreateGroup: () => void;
	onCancel: () => void;
	onFastGroupPreset: (preset: FastGroupPreset) => void;
	onCopyGroupSetting: () => void;
	onPasteGroupSetting: () => void;
	onClearGroupSetting: () => void;
}

export class ButtonsSet {
	private readonly cancelRow: HTMLElement;
	private readonly fastGroupSection: HTMLElement;
	private readonly fastGroupRow: HTMLElement;
	private readonly rangeSection: HTMLElement;
	private readonly groupSection: HTMLElement;
	private readonly pasteButton: ButtonComponent;

	constructor(
		private readonly containerEl: HTMLElement,
		private readonly callbacks: ButtonsSetCallbacks,
	) {
		const contentEl = containerEl.createDiv('ba-buttons-set-content');
		this.cancelRow = contentEl.createDiv('ba-buttons-set-cancel-row');
		const cancelButton = new ButtonComponent(this.cancelRow)
			.setIcon('x')
			.setTooltip('Cancel')
			.onClick(() => this.callbacks.onCancel());
		cancelButton.buttonEl.setAttribute('aria-label', 'Cancel');
		cancelButton.buttonEl.addClass('ba-clear-button');

		this.fastGroupSection = contentEl.createDiv(
			'ba-buttons-set-fast-group',
		);
		this.fastGroupRow = this.fastGroupSection.createDiv(
			'ba-annotate-segment-action-row',
		);

		this.rangeSection = contentEl.createDiv('ba-buttons-set-range');
		const rangeRow = this.rangeSection.createDiv(
			'ba-annotate-segment-action-row',
		);
		const createGroupButton = new ButtonComponent(rangeRow)
			.setIcon('plus')
			.onClick(() => this.callbacks.onCreateGroup());
		createGroupButton.buttonEl.addClass('ba-annotate-group-button');
		createGroupButton.buttonEl.createSpan({ text: 'Create' });

		this.groupSection = contentEl.createDiv('ba-buttons-set-group');
		const groupRow = this.groupSection.createDiv(
			'ba-annotate-segment-action-row',
		);
		const copyButton = new ButtonComponent(groupRow)
			.setIcon('copy')
			.onClick(() => this.callbacks.onCopyGroupSetting());
		copyButton.buttonEl.createSpan({ text: 'Copy' });
		this.pasteButton = new ButtonComponent(groupRow)
			.setIcon('clipboard')
			.onClick(() => this.callbacks.onPasteGroupSetting());
		this.pasteButton.buttonEl.createSpan({ text: 'Paste' });
		const clearButton = new ButtonComponent(groupRow)
			.setIcon('eraser')
			.onClick(() => this.callbacks.onClearGroupSetting());
		clearButton.buttonEl.createSpan({ text: 'Clear' });

		const dragHandle = containerEl.createDiv('ba-buttons-set-drag-handle');
		setIcon(dragHandle, 'grip-horizontal');
		dragHandle.setAttribute('aria-label', 'Move buttons');
		this.makeDraggable(dragHandle);
	}

	setFastGroupPresets(presets: FastGroupPreset[]) {
		this.fastGroupRow.empty();
		this.fastGroupRow.hidden = presets.length === 0;
		for (const preset of presets) {
			const label = preset.title.trim() || 'Preset';
			const button = new ButtonComponent(this.fastGroupRow).onClick(() =>
				this.callbacks.onFastGroupPreset(preset),
			);
			if (preset.icon.trim()) {
				button.setIcon(preset.icon.trim());
				button.buttonEl.createSpan({ text: label });
			} else {
				button.setButtonText(label);
			}
			button.buttonEl.addClass('ba-annotate-fast-group-button');
			button.buttonEl.setCssProps({
				'--ba-fast-group-button-color': preset.buttonColor,
				'--ba-fast-group-button-text-color': preset.buttonTextColor,
			});
			if (preset.description.trim()) {
				button.setTooltip(preset.description.trim());
			}
		}
	}

	update(selection: PreviewSelectionState, canPaste: boolean) {
		this.containerEl.hidden = selection.type === 'none';
		this.cancelRow.hidden = selection.type === 'none';
		this.fastGroupSection.hidden = selection.type === 'none';
		this.rangeSection.hidden = selection.type !== 'range';
		this.groupSection.hidden = selection.type !== 'group';
		this.pasteButton.buttonEl.disabled = !canPaste;
	}

	private makeDraggable(handleEl: HTMLElement) {
		handleEl.addEventListener('pointerdown', (event) => {
			if (event.button !== 0) return;
			event.preventDefault();
			const parent = this.containerEl.parentElement;
			if (!parent) return;

			const parentRect = parent.getBoundingClientRect();
			const rect = this.containerEl.getBoundingClientRect();
			const startLeft = rect.left - parentRect.left;
			const startTop = rect.top - parentRect.top;
			const startX = event.clientX;
			const startY = event.clientY;
			// Switch from right/bottom anchoring to explicit left/top.
			this.containerEl.setCssProps({
				left: `${startLeft}px`,
				top: `${startTop}px`,
				right: 'auto',
				bottom: 'auto',
			});

			const onMove = (moveEvent: PointerEvent) => {
				const maxLeft = Math.max(
					parent.clientWidth - this.containerEl.offsetWidth,
					0,
				);
				const maxTop = Math.max(
					parent.clientHeight - this.containerEl.offsetHeight,
					0,
				);
				const left = Math.min(
					Math.max(startLeft + moveEvent.clientX - startX, 0),
					maxLeft,
				);
				const top = Math.min(
					Math.max(startTop + moveEvent.clientY - startY, 0),
					maxTop,
				);
				this.containerEl.setCssProps({
					left: `${left}px`,
					top: `${top}px`,
				});
			};
			const onEnd = () => {
				handleEl.removeClass('is-dragging');
				handleEl.removeEventListener('pointermove', onMove);
				handleEl.removeEventListener('pointerup', onEnd);
				handleEl.removeEventListener('pointercancel', onEnd);
			};
			handleEl.setPointerCapture(event.pointerId);
			handleEl.addClass('is-dragging');
			handleEl.addEventListener('pointermove', onMove);
			handleEl.addEventListener('pointerup', onEnd);
			handleEl.addEventListener('pointercancel', onEnd);
		});
	}
}
