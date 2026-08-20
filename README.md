# Best Annotate

An Obsidian plugin for annotating your notes with styled text groups, underlines and phonetic marks.

## Features

- **Annotate blocks**: create an annotate block from the editor context menu (**Create annotate**), and click an existing block to edit it in place.
- **Text groups**: select any range inside an annotate block and style it independently:
    - Text color and background color
    - Underline with configurable color, thickness and offset
    - Phonetic annotation (ruby-style marks above or below the text) with color, font size, position and spacing control
- **Block appearance**: per-block font size, text color, background, max width, line height, margins, padding, border and text/paragraph alignment.
- **Fast group presets**: save reusable group styles as one-click buttons with custom title, icon and colors; manage them in the settings tab.
- **Final preview**: preview the generated output in render or HTML mode, with temporary highlights showing added / changed / deleted HTML (colors and duration are configurable).

## Installation

### From the community plugin list

Not available yet.

### Manual installation

1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/tadx2/Best-Annotate/releases).
2. Copy them into `<Vault>/.obsidian/plugins/best-annotate/`.
3. Reload Obsidian and enable **Best Annotate** in **Settings → Community plugins**.

## Usage

1. Open a note, right-click in the editor and choose **Create annotate**.
2. Enter the text and save — an annotate block is inserted at the cursor.
3. Click the block to open the editor: select text to create groups, apply underlines or phonetic marks, and adjust the block appearance.
4. Use the fast group preset buttons to apply saved styles with one click.

## Settings

Open **Settings → Best Annotate** to configure:

- **Group preset**: the default appearance applied to new group buttons.
- **Final preview settings**: default preview mode (render / HTML), highlight colors for added / changed / deleted HTML, and highlight duration.
- **Fast group button presets**: add, reorder, edit or delete preset buttons, or edit them directly as JSON.

## Privacy

The plugin works entirely offline. It makes no network requests and collects no data. Annotations are stored as HTML inside your notes.

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
npm run lint
```

## License

[MIT](LICENSE)
