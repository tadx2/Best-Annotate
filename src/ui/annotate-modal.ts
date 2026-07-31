import {
	App,
	ButtonComponent,
	Modal,
	Notice,
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
		this.setTitle(this.onDelete ? 'Edit annotate' : 'Add annotate');

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

		const actions = this.contentEl.createDiv('ba-annotate-actions');
		if (this.onDelete) {
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
