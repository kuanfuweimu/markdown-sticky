# Markdown Sticky

Source and releases: [kuanfuweimu/markdown-sticky](https://github.com/kuanfuweimu/markdown-sticky). See [CHANGELOG.md](CHANGELOG.md) for version history and [DEVLOG.md](DEVLOG.md) for development decisions and validation.

Local Markdown sticky notes for Windows with instant formatting: type `# `, `1. `, `- ` or `- [ ] ` and the heading, numbered list, bullet or to-do appears right away, like the everyday editing in Typora.

## Use

Open **Markdown Sticky** from the Start menu, or double-click `win-unpacked/Markdown Sticky.exe`. No Node.js or internet connection is needed. The app keeps a Start menu entry pointing at wherever this folder lives.

| Action | Shortcut |
| --- | --- |
| Indent / outdent list item | Tab / Shift+Tab |
| Continue list or numbering | Enter |
| End a list | Enter on an empty item |
| New note | Ctrl+N |
| Save | Ctrl+S (saving is automatic) |
| Bold | Ctrl+B |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z |
| Leave the editor | Esc, then Tab |
| Fold / open branch at caret | Ctrl+↑ / Ctrl+↓ |
| Fold / open everything | Ctrl+Shift+↑ / Ctrl+Shift+↓ |
| Heading down / up a level | Tab / Shift+Tab on a heading |
| Outline ↔ mind map | Ctrl+Shift+M |
| Zoom mind map | Ctrl+= / Ctrl+− / Ctrl+0 |
| Light ↔ dark | Ctrl+Shift+L |

## Outline and mind map

Every note is a foldable outline, in the spirit of outliner apps. Headings fold their whole section and list items with children fold their sub-list, from the arrow that appears in the left gutter. Folded branches show a … marker. The **H** button picks the heading size for you: the first heading becomes the title (H1), later ones match the section above; Tab / Shift+Tab move a heading down or up a level.

The map button next to ⋯ (or Ctrl+Shift+M) switches the same note to a mind map: the opening H1 is the root, headings branch by level and list items by indentation. Click a branch to fold it, double-click any node to jump to it in the outline. Folds are shared by both views, are kept while the window stays open, and never change the Markdown file. Each note remembers which view it was last in.

## Tone

The whole interface is grayscale. The sun/moon button in the title bar (Ctrl+Shift+L) flips a note between light and dark in one click and keeps a matching shade (Silver ↔ Graphite, Mist ↔ near-black). Open ⋯ and drag the **Tone** slider from white (0%) to black (100%), or pick a preset. Each note remembers its own tone; text switches to light ink on dark paper.

## Data

Notes live in `win-unpacked/data/notes/`, one UTF-8 `.md` file each. `index.json` stores tone, window position and other settings; `.md.bak` keeps the previous version of each note.

New and changed note files are discovered while the app runs, within about a second. All notes refreshes automatically, including when its list is already open. A clean open note updates from disk without saving the old text back over it. If an external edit conflicts with your unsaved typing, both are kept: the external file stays intact and your typing is saved to a separate note marked **Local copy**. An externally removed note disappears from the list; typing into its still-open window saves a separate copy.

For code or AI tools writing directly to this folder, use UTF-8 and the app's `<UUID>.md` filename convention; write to a temporary file and rename it into place. No manual index edit or app restart is needed. Arbitrarily named Markdown files can still be added through Import.

Closing a window keeps its content; reopen it from All notes. Archiving never deletes the file; turn on "Show archived notes" in All notes and click a note to restore it. Import creates a copy; export lets you choose a readable file name.

To back up or move the app, quit every note window first, then copy the whole folder. Do not move the `.exe` on its own.

## Scope

Supports headings, bold, italic, strikethrough, bulleted and numbered lists, nested to-dos, quotes, links and code. Notes with tables, images, HTML or footnotes (usually imported files) open read-only so they are never rewritten and nothing is lost.

Motion follows macOS conventions: enter animations ease out, exits are shorter and ease in, and the system "reduce motion" setting is respected.

Data stays on this computer: no account or cloud sync. No tray icon, auto-start or installer; the app is not commercially code-signed.

## Development

Node.js 24+: `npm ci` → `npm run build` → `npm test`. `npm run icon` regenerates the icon. Before `npm start`, run `node node_modules/electron/install.js` to download the runtime. `npm run package` builds the Windows x64 folder.

---

## 中文完整说明

源码与发布：[kuanfuweimu/markdown-sticky](https://github.com/kuanfuweimu/markdown-sticky)。版本历史见 [CHANGELOG.md](CHANGELOG.md)，开发决策与验证见 [DEVLOG.md](DEVLOG.md)。

这是 Windows 本地 Markdown 便签，支持即时排版：输入 `# `、`1. `、`- ` 或 `- [ ] ` 后立即呈现标题、编号、项目符号或待办，类似 Typora 的日常编辑体验。

### 使用

从开始菜单打开 **Markdown Sticky**，或双击 `win-unpacked/Markdown Sticky.exe`。运行不需要 Node.js 或网络。开始菜单入口会指向该文件夹的所在位置。

| 操作 | 快捷键 |
| --- | --- |
| 列表缩进 / 减少缩进 | Tab / Shift+Tab |
| 继续列表或编号 | Enter |
| 结束列表 | 在空项目上按 Enter |
| 新便签 | Ctrl+N |
| 保存 | Ctrl+S（也会自动保存） |
| 加粗 | Ctrl+B |
| 撤销 / 重做 | Ctrl+Z / Ctrl+Shift+Z |
| 离开编辑器 | Esc，再按 Tab |
| 折叠 / 展开光标所在分支 | Ctrl+↑ / Ctrl+↓ |
| 全部折叠 / 全部展开 | Ctrl+Shift+↑ / Ctrl+Shift+↓ |
| 标题降级 / 升级 | 在标题上按 Tab / Shift+Tab |
| 大纲 ↔ 思维导图 | Ctrl+Shift+M |
| 缩放思维导图 | Ctrl+= / Ctrl+− / Ctrl+0 |
| 浅色 ↔ 深色 | Ctrl+Shift+L |

### 大纲与思维导图

每张便签都是可折叠大纲，类似幕布。标题折叠整个章节，带子项的列表项折叠其子列表，点击左侧出现的箭头即可；折叠后显示 … 标记。**H** 按钮自动决定标题大小：第一个标题为主标题（H1），之后的标题跟随上方章节层级；在标题上按 Tab / Shift+Tab 降级或升级。

⋯ 左边的导图按钮（或 Ctrl+Shift+M）把同一张便签切换成思维导图：开头的 H1 为中心，标题按层级分支，列表按缩进分支。单击分支折叠，双击节点跳回大纲编辑。两种视图共享折叠状态，窗口打开期间保留，且不会修改 Markdown 文件。每张便签记住上次使用的视图。

### 色调

界面为灰度。标题栏的太阳/月亮按钮（Ctrl+Shift+L）一键切换浅色/深色，并保持对应深浅（Silver ↔ Graphite，Mist ↔ 近黑）。打开 ⋯，将 **Tone** 滑块从白色（0%）拖到黑色（100%），或选择预设。每张便签分别保存色调；深色纸面会使用浅色文字。

### 数据

便签位于 `win-unpacked/data/notes/`，每张为一个 UTF-8 `.md` 文件。`index.json` 保存色调、窗口位置等设置，`.md.bak` 保存各便签的上一版本。

应用运行期间约一秒内发现新增及修改的文件；All notes 即使已打开也会刷新。没有本地编辑的便签从磁盘更新，不会把旧文字写回。外部修改与未保存输入冲突时保留两份：外部文件保持不变，本地输入保存为 **Local copy** 新便签。外部删除的文件从列表消失；在它仍打开的窗口输入，会保存独立副本。

代码或 AI 工具直接写入该目录时，使用 UTF-8 和 `<UUID>.md` 文件名，先写临时文件，再重命名到目标位置。不必手改索引或重启。任意文件名的 Markdown 仍可通过 Import 导入。

关窗不会删除内容，可在 All notes 重开。归档不删除文件；开启 Show archived notes 后点击便签即可恢复。Import 创建副本；Export 可指定易读文件名。

备份或移动应用前，先退出全部便签窗口，再复制整个文件夹，不要只移动 `.exe`。

### 范围

支持标题、粗体、斜体、删除线、无序/有序列表、嵌套待办、引用、链接及代码。含表格、图片、HTML 或脚注的便签（通常来自导入）以只读方式打开，避免重写或丢失内容。

动效遵循 macOS 习惯：进入缓出，退出更短且缓入，并尊重系统“减少动态效果”设置。

数据仅保存在本机，没有账号或云同步；没有托盘图标、自启动或安装器，也没有商业代码签名。

### 开发

Node.js 24+：`npm ci` → `npm run build` → `npm test`。`npm run icon` 重建图标。运行 `npm start` 前用 `node node_modules/electron/install.js` 下载运行时。`npm run package` 构建 Windows x64 文件夹。
