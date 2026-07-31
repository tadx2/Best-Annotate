import { App, Modal, Notice, Setting } from 'obsidian';

export class AnnotateModal extends Modal {
	private text = '';

	constructor(
		app: App,
		private readonly onSave: (text: string) => void,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle('Add annotate');

		new Setting(this.contentEl)
			.setName('Text')
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder('Enter annotate text')
					.onChange((value) => {
						this.text = value;
					});

				textArea.inputEl.rows = 5;
				textArea.inputEl.focus();
			});

		new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText('Cancel').onClick(() => this.close());
			})
			.addButton((button) => {
				button
					.setButtonText('Save')
					.setCta()
					.onClick(() => this.save());
			});
	}

	onClose() {
		this.contentEl.empty();
	}

	private save() {
		const text = this.text.trim();
		if (!text) {
			new Notice('Enter some text first.');
			return;
		}

		this.onSave(text);
		this.close();
	}
}
