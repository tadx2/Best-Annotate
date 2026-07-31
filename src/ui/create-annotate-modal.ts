import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	TextAreaComponent,
} from 'obsidian';

export interface CreateAnnotateModalOptions {
	initialText?: string;
	onSave: (text: string) => void;
}

export class CreateAnnotateModal extends Modal {
	private text: string;

	constructor(
		app: App,
		private readonly options: CreateAnnotateModalOptions,
	) {
		super(app);
		this.text = options.initialText ?? '';
	}

	onOpen() {
		this.setTitle('Create annotate');

		this.contentEl.createDiv({
			cls: 'ba-annotate-section-label',
			text: 'Text',
		});
		const textArea = new TextAreaComponent(this.contentEl)
			.setPlaceholder('Enter annotate text')
			.setValue(this.text)
			.onChange((value) => {
				this.text = value;
			});
		textArea.inputEl.rows = 5;
		textArea.inputEl.addClass('ba-annotate-textarea');

		const actions = this.contentEl.createDiv('ba-annotate-actions');
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

	private save() {
		if (!this.text.trim()) {
			new Notice('Enter some text first.');
			return;
		}

		const text = this.text;
		this.close();
		this.options.onSave(text);
	}
}
