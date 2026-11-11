# 开发日志

## 2026-11-11 · v1.5.0 · 层级编号

**需求**：编号列表显示为 1.1、1.2、2.1.1 这样的层级结构。

**实现**：outline 插件新增 outlineNumbers(doc)，遍历文档，为编号列表项计算层级编号（尊重列表起始号；项目符号或待办列表下的编号列表重新开始），以节点装饰写入 data-num 和按编号长度计算的缩进宽度。CSS 隐藏浏览器原生编号，用 ::before 显示。编号放在插件状态中，导图读取同一份数据显示在节点前。不修改文档，因此 Markdown 文件保持标准格式。

**验证**：49 项测试通过，覆盖多层编号、起始号、项目符号下重新编号、文件格式不变及导图编号。真实窗口中的对齐仍需用户确认。

---

## 2026-11-11 · v1.4.2 · 关不掉窗口

**原因**：关闭按钮和 beforeunload 都要求 flush() 返回 true。flush 在 view.composing 为真时直接返回 false 并排队重试，这个检查在 dirty 判断之前，所以即使没有未保存内容，只要输入法处于组合状态就拒绝关闭。主进程 fadeClose 淡出后，beforeunload 取消关闭，400ms 后窗口淡入回来，看起来像关不掉。导图节点编辑中关闭时，输入框内容也不会保存。

**实现**：flush(force) 在关闭、归档和卸载时忽略组合状态，取编辑器当前 Markdown 保存。新增 prepareClose() 先提交导图中的节点编辑再强制保存；仅当磁盘保存真正失败时阻止关闭并抖动状态栏。普通自动保存仍等待组合结束，避免打断输入。

**验证**：47 项测试通过；新增测试模拟导图编辑中关闭和输入法卡在组合状态时关闭，均能保存并关闭。真实窗口仍需用户确认。

---

## 2026-11-11 · v1.4.1 · 平滑缩放

**原因**：setZoom 每次调用 render()，销毁并重建所有节点（还会重播淡入动画），且 CSS zoom 触发整页重新排版；滚轮每格固定 10%，没有缓动，也不以光标为中心。

**实现**：缩放只修改画布的 transform: scale，外层 sizer 按缩放后尺寸撑开滚动区域；目标值逐帧以 0.32 系数缓动，并按锚点调整 scrollLeft/Top，使光标下的内容保持不动。滚轮增量按指数映射，触控板小增量对应小步长。缩放时临时加 will-change，结束 120ms 后移除以重新清晰栅格化。重新渲染时保留滚动位置，节点淡入只在首次打开时播放。

**验证**：46 项测试通过，新增测试确认缩放分帧过渡、落在目标值、不重建节点、滚动区域随缩放更新。实际流畅度需在真实窗口确认。

---

## 2026-11-11 · v1.4.0 · 导图编辑修复、标题栏标题、默认深色

**反馈**：v1.3.0 安装后导图仍然无法编辑；文档没有可设置的标题；希望默认深色。

**原因**：拖动时在导图容器上调用 setPointerCapture。Chromium 会把捕获期间产生的 click/dblclick 转给捕获元素，双击的目标变成画布而不是节点，所以编辑从未触发。jsdom 不实现捕获重定向，测试直接派发 dblclick 到节点，因而没有发现。用户的便签都不是只读，排除了只读原因。

**实现**：拖动改为在 document 上监听 pointermove/up，不再捕获；在 pointerup 中自行判断同一节点 450ms 内的第二次点击为编辑，不依赖浏览器 dblclick；选中节点后直接输入字符即开始编辑；导图模式工具栏换成可见的编辑按钮。标题栏输入框直接编辑开头的 H1（无则插入，清空则删除），并同步窗口标题。store 新建便签 tone 默认 100，CSS 默认变量改为黑色避免启动闪白。

**验证**：45 项测试通过。新增测试经由 pointerdown/up 路径验证连点编辑，不依赖 dblclick。真实窗口内效果仍需用户确认。

---

## 2026-11-11 · v1.3.0 · 可编辑、可拖动的思维导图

**反馈**：导图无法移动，希望在导图中直接编辑。

**实现**

- src/mindmap-edit.js：新增子节点、同级、改名、删除、勾选、移动，全部写成编辑器事务，所以自动保存、可撤销，并即时反映到大纲。节点用文档位置标识；标题按章节范围（到下一个同级或更高标题）操作，列表项按所在列表操作，删除列表中唯一项时一并删除空列表。
- 拖放语义：标题只能放在标题前后或成为其子章节，移动时整体调整层级；列表项和段落可放到任何节点下（段落会包装成列表项）；不允许放进自身分支。编辑器末尾的空段落不随章节移动。
- src/mindmap-view.js 改为 MindmapView 类：按指针事件区分点击、拖动（5px 阈值，悬浮预览与插入线/子节点高亮，靠近边缘自动滚动）和空白处平移；行内输入框编辑，处理输入法组合；新建节点未输入内容时取消即删除。
- 导图编辑进行中，外部同步跳过重载，避免覆盖正在输入的文字。

**验证**：43 项测试通过；新增覆盖文档层编辑（各节点类型的增删改移与撤销）以及渲染层的键盘编辑、拖放、只读便签保护。jsdom 不做布局，拖放命中通过模拟 elementFromPoint 测试；真实窗口内的拖动手感尚需用户确认。

---

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

### 2026-11-11 · v1.5.0 · Hierarchical numbering

**Request.** Show numbered lists as 1.1, 1.2, 2.1.1.

**Implementation.** The outline plugin adds outlineNumbers(doc), which walks the document and computes hierarchical numbers for ordered-list items (honouring start numbers; a numbered list under a bullet or to-do list restarts). Node decorations write data-num and a gutter width sized to the number. CSS hides the native markers and shows ::before. The numbers live in plugin state, and the mind map reads the same data for its nodes. The document is not modified, so the Markdown stays standard.

**Validation.** 49 tests pass, covering multi-level numbers, start numbers, restarts under bullets, unchanged file format and map numbers. Alignment in the real window still needs confirmation.

### 2026-11-11 · v1.4.2 · Window would not close

**Cause.** The close button and beforeunload both required flush() to return true. flush returned false whenever view.composing was true, and checked that before dirty, so an active IME composition refused to close even with nothing unsaved. After fadeClose faded the window out, beforeunload cancelled the close and the window faded back in 400ms later, looking stuck. Closing during a map label edit also dropped the typed text.

**Implementation.** flush(force) ignores composition on close, archive and unload and saves the editor's current Markdown. A new prepareClose() commits any map label edit, then force-saves; only a real disk save failure blocks closing, with a status shake. Regular autosave still waits for composition to end so typing is not interrupted.

**Validation.** 47 tests pass, including closing during a map edit and with a stuck IME composition; both save and close. Real-window behaviour still needs user confirmation.

### 2026-11-11 · v1.4.1 · Smooth zoom

**Cause.** setZoom called render(), destroying and rebuilding every node (replaying the fade-in), and CSS zoom forced a full relayout. Each wheel notch was a fixed 10% with no easing and no cursor anchor.

**Implementation.** Zoom changes only the canvas transform: scale; an outer sizer grows the scroll area to the scaled size. The value eases toward the target each frame (factor 0.32) while scrollLeft/Top keep the point under the cursor fixed. Wheel deltas map exponentially, so small trackpad deltas give small steps. will-change is set only while zooming and removed 120ms after, so text re-rasterizes sharply. Re-renders keep the scroll position, and the node fade-in plays only on first open.

**Validation.** 46 tests pass; a new test checks the zoom animates over frames, settles on target, does not rebuild nodes and resizes the scroll area. Smoothness in the real window still needs confirmation.

### 2026-11-11 · v1.4.0 · Map editing fix, title-bar title, dark default

**Feedback.** After installing v1.3.0 the map still could not be edited; notes had no settable title; dark should be the default.

**Cause.** Dragging called setPointerCapture on the map container. Chromium retargets click/dblclick generated during capture to the capturing element, so dblclick hit the canvas instead of the node and editing never started. jsdom does not implement that retargeting and the test dispatched dblclick directly on the node, so it passed. The user's notes were all editable, ruling out read-only mode.

**Implementation.** Drag tracking listens on document pointermove/up without capture. A second pointerup on the same node within 450ms starts editing, independent of dblclick; typing a character on a selected node also starts editing; the map toolbar shows visible edit buttons. A title-bar input edits the opening H1 (inserting or removing it as needed) and updates the window title. New notes default to tone 100 and CSS defaults are black to avoid a white flash.

**Validation.** 45 tests pass; the new test drives editing through pointerdown/up rather than dblclick. Behaviour in the real window still needs user confirmation.

### 2026-11-11 · v1.3.0 · Editable, draggable mind map

**Feedback.** The map could not be moved and should be editable in place.

**Implementation**
- src/mindmap-edit.js adds child, sibling, rename, delete, check and move, all as editor transactions, so they autosave, undo and update the outline. Nodes are identified by document position; headings act on their section (to the next heading of the same or higher level), list items on their list, and removing the only item in a list removes the empty list.
- Drop rules: headings go before/after headings or become a sub-section, shifting levels together; list items and paragraphs can go under any node (paragraphs are wrapped as list items); a node cannot be dropped into its own branch. The editor's trailing empty paragraph stays put.
- src/mindmap-view.js becomes a MindmapView class. Pointer events distinguish click, drag (5px threshold, floating preview, insertion line or child highlight, edge auto-scroll) and background panning. Inline input editing handles IME composition; a new node left empty is removed.
- While a map label is being edited, external sync skips reloading so typing is not overwritten.

**Validation.** 43 tests pass, including document-level edits for every node kind with undo, and renderer-level keyboard editing, drag and drop, and read-only protection. jsdom has no layout, so drop targeting is tested by stubbing elementFromPoint; drag feel in the real window still needs user confirmation.

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
