# 开发日志

## 2026-11-11 · v1.2.0 · 浅色/深色切换

**实现**：沿用每张便签的 tone（0–100），不新增主题系统。src/tone.js 的 flipTone 取 100 − tone；若镜像后仍在同一侧（tone 45–55 一带）则切到 0 或 100，保证每次翻转。标题栏按钮显示将切换到的模式（浅色纸面显示月亮，深色显示太阳），Ctrl+Shift+L 同效，结果通过现有 meta 接口保存。

**验证**：35 项测试通过；新增覆盖 0–100 每个 tone 都会翻转明暗，以及按钮和快捷键切换并保存 tone。

---

## 2026-11-11 · v1.1.0 · 可折叠大纲与思维导图

**需求**：所有标题与列表默认可折叠、标题大小自动，类似幕布；并可一键切换思维导图视图。

**实现**

- 新增 ProseMirror 插件 src/outline.js：扫描可折叠块（有内容的顶层标题章节、含子列表的列表项），用节点装饰隐藏内容，用小部件放置折叠箭头。折叠状态只存于编辑器插件状态并随编辑映射位置，不进入文档，因此 Markdown 不变、不会触发保存。
- 折叠时把光标移到分支标题；其他操作把光标移入隐藏内容时自动展开，避免在看不见的位置输入。
- H 按钮按上方最近标题决定层级；Tab / Shift+Tab 作用于标题时调整层级，与列表缩进一致。
- src/mindmap.js 从同一文档生成树（H1 为根，标题按层级、列表按缩进）；src/mindmap-view.js 以列宽 + 叶行布局绘制 SVG 连线与按钮节点。导图节点携带文档位置，单击调用同一折叠命令，双击回到大纲并定位。
- 视图偏好以 view 元数据保存在 index.json；store 仅接受 outline/mindmap。
- Electron 默认菜单把 Ctrl+M 绑定为最小化，所以视图切换使用 Ctrl+Shift+M。

**验证**：33 项测试（新增 10 项）覆盖折叠检测、折叠不改 Markdown、点击箭头、光标自动展开、编辑后位置映射、自动标题层级、导图树与布局、渲染层视图切换与共享折叠、视图记忆，以及等待自动保存周期后无写入。测试使用 jsdom，没有接管用户屏幕；Electron 窗口中的实际视觉效果尚待用户在应用内确认。

**限制**：折叠状态在窗口关闭后不保留；导图为浏览/导航视图，编辑在大纲中完成；含表格/图片的只读便签同样可折叠与查看导图。

---

## 2026-10-31 · v1.0.1 · 运行期间同步外部便签

**问题与复现**

应用启动后，在 notes/ 中写入一份合法 UUID 文件名的 Markdown 文件。文件已存在，但打开 All notes 时列表不包含它。旧版仅在 NoteStore 构造时扫描文件夹，之后读取内存中的索引，且没有通知已打开窗口更新。

**实现**

- 存储层增加按需扫描和共享后台轮询，持久化新发现的便签，同时跳过已移除的文件。
- 主进程把文件变化及应用内创建、保存、归档通知发送给所有窗口；预加载层仅暴露受限的订阅回调和取消订阅方法。
- 渲染层刷新已经打开的列表，并在没有本地编辑时重新加载便签。等待 IPC 期间若开始输入，旧的响应不能覆盖新输入。
- 保存携带内容版本摘要；存在冲突或原文件已删除时把本地编辑保存为单独副本，并将当前窗口绑定到该副本。
- 测试发现初始化阶段的自动排版也会触发更新事件。现在排除加载中的更新与没有原始文档修改的事务，防止自动保存无意重写外部文件。

**验证**

23 项测试覆盖原有编辑能力、新文件发现、原子替换、后台通知、已打开列表刷新、干净窗口更新、输入冲突、延迟响应、文件删除、备份与元数据保留。测试使用临时目录和内存 DOM，没有接管用户屏幕。

**发布与限制**

源代码、更新日志和 Windows 发布包使用同一 v1.0.1 版本。构建输出和用户数据隔离。加载新应用代码需要一次重新启动；此后文件同步在运行期间自动完成。直接写入 notes/ 的文件使用现有 UUID.md 约定；任意文件名仍可通过 Import 导入。

**参考**

- [Electron IPC renderer API](https://www.electronjs.org/docs/latest/api/ipc-renderer)
- [Node.js file system API](https://nodejs.org/api/fs.html)

---

## English development log

### 2026-11-11 · v1.2.0 · Light/dark switch

**Implementation.** Reuses each note's existing tone (0–100) instead of adding a theme system. flipTone in src/tone.js returns 100 − tone, or 0/100 when the mirror stays on the same side (around 45–55), so every press flips. The title-bar button shows the mode it switches to (moon on light paper, sun on dark); Ctrl+Shift+L does the same, saving through the existing meta call.

**Validation.** 35 tests pass, including a check that every tone 0–100 flips, and button/shortcut switching that saves the tone.

### 2026-11-11 · v1.1.0 · Foldable outline and mind map

**Request.** Make every heading and list foldable with automatic heading sizes, like an outliner, plus a one-click mind map view.

**Implementation**
- A ProseMirror plugin (src/outline.js) finds foldable blocks (top-level heading sections with content, list items with nested lists), hides content with node decorations and places toggles as widgets. Fold state lives in plugin state and maps through edits; it never enters the document, so the Markdown is unchanged and no save is triggered.
- Folding moves the caret to the branch title; any other move into hidden content unfolds it so typing never lands somewhere invisible.
- The H button picks the level from the nearest heading above; Tab / Shift+Tab on a heading changes its level, matching list indentation.
- src/mindmap.js builds a tree from the same document; src/mindmap-view.js lays it out by column width and leaf rows with SVG links. Map nodes carry document positions, so click uses the same fold command and double-click returns to the outline at that block.
- The view preference is stored as view metadata in index.json; the store accepts only outline/mindmap.
- Electron's default menu binds Ctrl+M to Minimize, so the view toggle uses Ctrl+Shift+M.

**Validation.** 33 tests (10 new) cover fold detection, Markdown unchanged by folding, toggle clicks, caret auto-unfold, position mapping after edits, automatic heading level, mind-map tree and layout, renderer view switching with shared folds, remembered view, and no write after the autosave interval. Tests use jsdom, not the user's screen; the look inside the Electron window still needs confirmation in the app.

**Limitations.** Folds are not kept after a window closes. The mind map is a viewing/navigation view; editing happens in the outline. Read-only notes with tables or images can also fold and show the map.

### 2026-10-31 · v1.0.1 · Sync external notes while running

**Problem and reproduction.** After app startup, a Markdown file with a valid UUID filename was written into `notes/`. The file existed but All notes omitted it. Previously NoteStore scanned only during construction, then used its in-memory index without notifying open windows.

**Implementation**
- Storage adds on-demand scans and shared background polling, persists newly found notes and skips removed files.
- The main process broadcasts file changes and in-app creation, saving and archiving to all windows. Preload exposes only restricted subscribe/unsubscribe callbacks.
- The renderer refreshes open lists and reloads notes without local edits. A delayed IPC response cannot overwrite typing that began while waiting.
- Saving includes a content-revision digest. Conflicts or deleted originals preserve local edits as a separate copy and bind the current window to that copy.
- Tests found that initialization formatting also emitted update events. Loading updates and transactions without original-document changes are now excluded to prevent accidental autosave over external files.

**Validation.** 23 tests cover existing editing features, file discovery, atomic replacement, background notifications, open-list refresh, clean-window updates, edit conflicts, delayed responses, deletion, backups and metadata preservation. Tests use temporary directories and an in-memory DOM, not the user's screen.

**Release and limitations.** Source, changelog and Windows package all use v1.0.1. Build output is isolated from user data. One restart loads updated code; file sync then runs automatically. Files written directly into `notes/` follow the existing UUID.md convention; arbitrary filenames can be added through Import.

References: [Electron IPC renderer API](https://www.electronjs.org/docs/latest/api/ipc-renderer), [Node.js file system API](https://nodejs.org/api/fs.html).
