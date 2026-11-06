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

## Tone

The whole interface is grayscale. Open ⋯ and drag the **Tone** slider from white (0%) to black (100%), or pick a preset. Each note remembers its own tone; text switches to light ink on dark paper.

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

### 色调

界面为灰度。打开 ⋯，将 **Tone** 滑块从白色（0%）拖到黑色（100%），或选择预设。每张便签分别保存色调；深色纸面会使用浅色文字。

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
