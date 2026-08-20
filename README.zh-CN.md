# Best Annotate

<p align="center">
	<img src="best-annotate-logo.svg" alt="Best Annotate logo" width="128">
</p>

[English](README.md) | **简体中文**

一个 Obsidian 插件，可以为笔记添加带样式的文本分组、下划线和注音标记。

## 功能

- **批注块**：在编辑器右键菜单中选择 **Create annotate** 创建批注块，点击已有批注块即可就地编辑。
- **文本分组**：选中批注块内的任意文本，独立设置样式：
    - 文字颜色和背景色
    - 下划线，可配置颜色、粗细和偏移
    - 注音标记（类似 ruby 标注，可显示在文字上方或下方），可配置颜色、字号、位置和间距
- **块外观**：每个批注块可单独设置字号、文字颜色、背景、最大宽度、行高、外边距、内边距、边框以及文字/段落对齐方式。
- **快捷分组预设**：将可复用的分组样式保存为一键按钮，支持自定义标题、图标和颜色；在设置页中管理。
- **最终预览**：以渲染或 HTML 模式预览生成的输出，并用临时高亮显示新增 / 修改 / 删除的 HTML（颜色和时长均可配置）。

## 安装

### 从社区插件市场安装

暂未上架。

### 手动安装

1. 从最新的 [release](https://github.com/tadx2/Best-Annotate/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将它们复制到 `<Vault>/.obsidian/plugins/best-annotate/`。
3. 重启 Obsidian，并在 **设置 → 第三方插件** 中启用 **Best Annotate**。

## 使用方法

1. 打开一篇笔记，在编辑器中右键并选择 **Create annotate**。
2. 输入文本并保存——批注块会插入到光标处。
3. 点击批注块打开编辑器：选中文本创建分组，应用下划线或注音标记，并调整块外观。
4. 使用快捷分组预设按钮，一键应用已保存的样式。

## 设置

打开 **设置 → Best Annotate** 进行配置：

- **Group preset**：新建批注块时应用的默认外观（**Default group preset**）。
- **Final preview settings**：默认预览模式（渲染 / HTML）、新增 / 修改 / 删除 HTML 的高亮颜色，以及高亮时长。
- **Fast group button presets**：添加、排序、编辑或删除预设按钮，或直接以 JSON 方式编辑。
- **Developer**：仅用于开发的选项（**Dev mode**、**Use default text content**），可为新批注预填示例文本。

## 快捷分组预设示例

现成的预设文件位于 [`src/presets/`](src/presets/)：

- [`syntax-presets-grammer-en.json`](src/presets/syntax-presets-grammer-en.json)——英文语法标注（Subject、Predicate、Object、Complement、Adverbial），每项使用不同颜色的下划线和标签。
- [`syntax-presets-grammer-cn.json`](src/presets/syntax-presets-grammer-cn.json)——同一组预设，使用中文标题和标签（主语、谓语、宾语、补语、状语）。

使用方法：

1. 打开 **设置 → Best Annotate → Fast group button presets**。
2. 点击 **Edit presets as JSON**。
3. 粘贴文件内容并保存。

保存会**替换所有**现有预设。如果想合并而不是替换，请把新条目追加到现有的 JSON 数组中。

一个最小预设如下所示：

```json
[
  {
    "title": "主语",
    "description": "Subject",
    "icon": "",
    "buttonColor": "#e03131",
    "buttonTextColor": "#ffffff",
    "appearance": {
      "underline": true,
      "underlineColor": "#e03131",
      "annotate": "主语",
      "annotateColor": "#e03131",
      "annotatePosition": "under"
    }
  }
]
```

任何省略的字段都会回退到默认外观，因此只需列出想要覆盖的字段。

## 隐私

本插件完全离线工作，不发起任何网络请求，也不收集任何数据。批注以 HTML 形式存储在你的笔记中。

## 开发

```bash
npm install
npm run dev    # 监听模式
npm run build  # 生产构建
npm run lint
```

## 许可证

[MIT](LICENSE)
