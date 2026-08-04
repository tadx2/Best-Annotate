import { ButtonComponent } from 'obsidian';
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
	private readonly rangeSection: HTMLElement;
	private readonly fastGroupSection: HTMLElement;
	private readonly fastGroupRow: HTMLElement;
	private readonly groupSection: HTMLElement;
	private readonly pasteButton: ButtonComponent;

	constructor(
		private readonly containerEl: HTMLElement,
		private readonly callbacks: ButtonsSetCallbacks,
	) {
		this.rangeSection = containerEl.createDiv('ba-buttons-set-range');
		const rangeRow = this.rangeSection.createDiv(
			'ba-annotate-segment-action-row',
		);
		const createGroupButton = new ButtonComponent(rangeRow)
			.setButtonText('Create group')
			.onClick(() => this.callbacks.onCreateGroup());
		createGroupButton.buttonEl.addClass('ba-annotate-group-button');
		new ButtonComponent(rangeRow)
			.setButtonText('Cancel')
			.onClick(() => this.callbacks.onCancel());

		this.fastGroupSection = containerEl.createDiv(
			'ba-buttons-set-fast-group',
		);
		this.fastGroupRow = this.fastGroupSection.createDiv(
			'ba-annotate-segment-action-row',
		);

		this.groupSection = containerEl.createDiv('ba-buttons-set-group');
		const groupRow = this.groupSection.createDiv(
			'ba-annotate-segment-action-row',
		);
		new ButtonComponent(groupRow)
			.setButtonText('Copy group setting')
			.onClick(() => this.callbacks.onCopyGroupSetting());
		this.pasteButton = new ButtonComponent(groupRow)
			.setButtonText('Paste group setting')
			.onClick(() => this.callbacks.onPasteGroupSetting());
		new ButtonComponent(groupRow)
			.setButtonText('Clear group setting')
			.onClick(() => this.callbacks.onClearGroupSetting());
	}

	setFastGroupPresets(presets: FastGroupPreset[]) {
		this.fastGroupRow.empty();
		this.fastGroupRow.hidden = presets.length === 0;
		for (const preset of presets) {
			const button = new ButtonComponent(this.fastGroupRow)
				.setButtonText(preset.title.trim() || 'Preset')
				.onClick(() => this.callbacks.onFastGroupPreset(preset));
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
		this.rangeSection.hidden = selection.type !== 'range';
		this.fastGroupSection.hidden = selection.type === 'none';
		this.groupSection.hidden = selection.type !== 'group';
		this.pasteButton.buttonEl.disabled = !canPaste;
	}
}
