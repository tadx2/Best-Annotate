import { App, ButtonComponent, Modal, TextAreaComponent } from 'obsidian';

export class EditFastGroupPresetsModal extends Modal {
	private inputEl: TextAreaComponent | null = null;

	constructor(
		app: App,
		private readonly json: string,
		private readonly onSave: (json: string) => boolean,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle('Edit fast group presets');
		contentEl.createEl('p', {
			text: 'Edit the preset JSON directly. Saving replaces all current presets and regenerates preset ids.',
		});
		this.inputEl = new TextAreaComponent(contentEl);
		this.inputEl.inputEl.rows = 15;
		this.inputEl.inputEl.addClass('ba-edit-presets-textarea');
		this.inputEl.setValue(this.json);
		const actions = contentEl.createDiv({ cls: 'modal-button-container' });
		new ButtonComponent(actions)
			.setButtonText('Save')
			.setCta()
			.onClick(() => {
				const json = this.inputEl?.getValue() ?? '';
				if (this.onSave(json)) {
					this.close();
				}
			});
		new ButtonComponent(actions).setButtonText('Cancel').onClick(() => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly message: string,
		private readonly confirmText: string,
		private readonly onConfirm: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: this.message });
		const actions = contentEl.createDiv({ cls: 'modal-button-container' });
		new ButtonComponent(actions)
			.setButtonText(this.confirmText)
			.setDestructive()
			.onClick(() => {
				this.onConfirm();
				this.close();
			});
		new ButtonComponent(actions).setButtonText('Cancel').onClick(() => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
