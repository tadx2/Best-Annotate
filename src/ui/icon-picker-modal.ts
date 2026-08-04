import { App, Modal, TextComponent, setIcon } from 'obsidian';
import { ICON_GROUPS } from '../icon-names';

export class IconPickerModal extends Modal {
	private gridEl: HTMLElement | null = null;
	private filter = '';

	constructor(
		app: App,
		private readonly current: string,
		private readonly onPick: (icon: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle('Choose an icon');
		const search = new TextComponent(contentEl);
		search.setPlaceholder('Search icons');
		search.inputEl.addClass('ba-icon-picker-search');
		search.onChange((value) => {
			this.filter = value.trim().toLowerCase();
			this.renderGrid();
		});
		this.gridEl = contentEl.createDiv('ba-icon-picker-grid');
		this.renderGrid();
	}

	private renderGrid(): void {
		const grid = this.gridEl;
		if (!grid) return;
		grid.empty();

		this.addOption(grid, '', 'ban');
		for (const group of ICON_GROUPS) {
			const icons = group.icons.filter(
				(name) => !this.filter || name.includes(this.filter),
			);
			if (icons.length === 0) continue;

			grid.createDiv({ cls: 'ba-icon-picker-group', text: group.label });
			for (const name of icons) {
				this.addOption(grid, name, name);
			}
		}
	}

	private addOption(grid: HTMLElement, value: string, icon: string): void {
		const label = value || 'None';
		const button = grid.createEl('button', {
			cls: 'ba-icon-picker-option',
			attr: { 'aria-label': label, title: label },
		});
		button.type = 'button';
		if (value === this.current) {
			button.addClass('is-active');
		}
		setIcon(button, icon);
		button.addEventListener('click', () => {
			this.onPick(value);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
