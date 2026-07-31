import {
	App,
	Modal,
	Notice,
	Setting,
	TextAreaComponent,
} from 'obsidian';

export class AnnotateModal extends Modal {
	private text: string;

	constructor(
		app: App,
		private readonly onSave: (text: string) => void,
		initialText = '',
		private readonly onDelete?: () => void,
	) {
		super(app);
		this.text = initialText;
	}

	onOpen() {
		this.setTitle(this.text ? 'Edit annotate' : 'Add annotate');

		this.contentEl.createDiv({ text: 'Text' });
		const textArea = new TextAreaComponent(this.contentEl)
			.setPlaceholder('Enter annotate text')
			.setValue(this.text)
			.onChange((value) => {
				this.text = value;
			});

		textArea.inputEl.rows = 5;
		textArea.inputEl.addClass('ba-annotate-textarea');
		textArea.inputEl.focus();

		const actions = new Setting(this.contentEl);
		if (this.onDelete) {
			actions.addButton((button) => {
				button
					.setButtonText('Delete')
					.setWarning()
					.onClick(() => this.delete());
			});
		}

		actions
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

	private delete() {
		this.onDelete?.();
		this.close();
	}
}
