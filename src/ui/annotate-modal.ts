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
