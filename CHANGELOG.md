# 更新日志

## 1.7.0 — 2026-11-12

### 新功能

- 所有列表项都显示层级编号（1. / 1.1 / 1.1.1），包括项目符号和待办；大纲与导图一致。中间隔着段落或标题时重新从 1 开始。
- 待办与折叠结合：包含待办的分支在行尾显示完成进度（如 2/5），统计分支内全部待办，全部完成显示 ✓；导图节点同样显示，勾选后实时更新。

### 调整

- 工具栏去掉 B（加粗）按钮；Ctrl+B 仍可用，已有的粗体不受影响。

### 维护

- 新增 3 项测试，共 54 项通过。编号规则写入 AGENTS.md。

## 1.6.1 — 2026-11-12

### 修复

- 整个窗口被放大、右上角按钮跑出窗口：Ctrl+= / Ctrl+− 和 Ctrl+滚轮会同时触发浏览器自带的页面缩放。现在页面固定 100%，缩放只作用于思维导图。
- 思维导图节点文字被截断成「工…」「素材…」：改为按真实字体测量宽度，长文字自动换行，节点高度随内容变化，始终显示全文。

## 1.6.0 — 2026-11-12

### 改进

- All notes 中点击便签在当前窗口打开，不再弹出新的小窗口；切换前自动保存。若该便签已在其他窗口打开，则切到那个窗口。
- All notes 显示两行内容预览（去掉 Markdown 符号，待办显示 ☐/☑），搜索也匹配预览内容；当前便签有边框标记。

### 维护

- 新增 2 项测试，共 50 项通过。

## 1.5.0 — 2026-11-11

### 新功能

- 嵌套编号列表显示层级编号 1. / 1.1 / 2.1.1，思维导图节点同样显示。编号随增删、缩进、拖动自动更新；只影响显示，文件仍为标准 Markdown。

### 维护

- 新增 2 项测试，共 49 项通过。

## 1.4.2 — 2026-11-11

### 修复

- 窗口有时点 × 关不掉：输入法处于组合状态（中文输入时常见，失去焦点后可能卡住）时，保存会一直等待，关闭被取消，窗口淡出后又弹回来。现在关闭时直接保存当前显示的文字并关闭；导图中正在编辑的节点也会先保存。只有真正的保存错误才会阻止关闭，并在状态栏提示。

## 1.4.1 — 2026-11-11

### 修复

- 导图缩放不流畅：以前每次缩放都重建整张导图并用 CSS zoom 重新排版。现在用 GPU 变换缩放、逐帧缓动，以鼠标位置为中心，触控板双指缩放连续跟手；缩放结束后文字重新清晰渲染。节点淡入只在首次打开导图时播放。

## 1.4.0 — 2026-11-11

### 新功能

- 标题栏可直接设置便签标题，保存为第一个 # 标题，同时作为列表名称和导图中心。
- 新便签默认深色；已有便签保持原色调。
- 导图模式下工具栏显示「＋ Child / ＋ Sibling / Rename / Delete」按钮。

### 修复

- 导图双击无法编辑：拖动用的指针捕获会把双击事件转给画布。改为在文档上监听拖动，并增加## 1.3.0 — 2026-11-11

### 新功能

- 思维导图可直接编辑：Tab 加子节点、Enter 加同级、双击/F2 改名、Delete 删除整枝、空格折叠、方向键选择、勾选待办。
- 拖动节点移动：拖到节点上成为子节点，拖到上/下边缘调整顺序；标题连同章节移动并自动调整层级。
- 拖空白处平移画布，Ctrl+滚轮缩放，Ctrl+Z / Ctrl+Y 撤销重做。
- 导图编辑即普通文档修改：自动保存为 Markdown，大纲同步更新。

### 维护

- 新增 8 项导图编辑测试，共 43 项通过。

## 1.2.0 — 2026-11-11

### 新功能

- 标题栏新增浅色/深色切换按钮（Ctrl+Shift+L）：按当前色调镜像切换，保持对应深浅；中间色调直接切到纯白或纯黑，确保每次都翻转。每张便签记住自己的选择，仍可用 Tone 滑块微调。

### 维护

- 新增 2 项测试，共 35 项通过。

## 1.1.0 — 2026-11-11

### 新功能

- 幕布式可折叠大纲：标题折叠整个章节，带子项的列表项折叠子列表；Ctrl+↑/↓ 折叠或展开光标处分支，加 Shift 作用于全部。光标移入折叠内容时自动展开。
- 标题大小自动：H 按钮按上下文选择层级（首个标题为 H1，其余跟随上方章节），Tab / Shift+Tab 在标题上降级/升级；H3–H6 字号层次更清晰。
- 一键思维导图视图（导图按钮或 Ctrl+Shift+M）：H1 为中心，标题与列表分支展开；单击折叠，双击跳回大纲，Ctrl+= / − / 0 缩放。两种视图共享折叠状态，每张便签记住上次视图。
- 折叠与视图切换只改变显示，不改写 Markdown 文件。

### 维护

- 新增 10 项大纲与导图测试，共 33 项通过。

## 1.0.1 — 2026-10-31

### 修复

- 程序运行期间新增 Markdown 便签后，“全部便签”列表不更新的问题；现在约一秒内自动发现新文件，列表已打开时也会刷新。
- 外部修改的便签会同步到未编辑的窗口；外部删除文件不会让整个列表加载失败。
- 外部修改与尚未保存的输入冲突时保留两份：外部文件不被覆盖，本地输入保存成标记为 Local copy 的新便签。
- 编辑器初始化、恢复选择区时的自动排版不再被误判为用户编辑，避免仅打开便签便重写文件。

### 维护

- 新增文件同步和并发编辑回归测试，共 23 项测试通过。
- 构建输出改为独立 release/，避免打包过程接触已安装程序的数据目录。
- 建立 GitHub 源码、开发日志和版本发布流程；发布包不包含个人便签。

安装本次修复后需要重新启动一次程序以加载新代码；之后新增或修改便签不需要重启。

## 1.0.0 — 2026-10-26

- 首个本地版本：即时 Markdown 排版、Tab 缩进、列表续写、待办复选框、多窗口、置顶、灰度主题及本地自动保存。

---

## English changelog

### 1.7.0 — 2026-11-12

**Features**
- Every list item shows a hierarchical number (1. / 1.1 / 1.1.1), bullets and to-dos included, in the outline and the map. A paragraph or heading between lists restarts at 1.
- To-dos meet folding: branches containing to-dos show done / total (e.g. 2/5) at the end of their line, counting all to-dos inside, with ✓ when complete; map nodes show the same and update as you check items.

**Changes**
- Removed the B (bold) toolbar button; Ctrl+B still works and existing bold text is unchanged.

**Maintenance**
- Added 3 tests; all 54 pass. The numbering rule is recorded in AGENTS.md.

### 1.6.1 — 2026-11-12

**Fixes**
- The whole window got magnified and the title-bar buttons went off screen: Ctrl+= / Ctrl+− and Ctrl+wheel also triggered Chromium's page zoom. The page now stays at 100% and zoom applies only to the mind map.
- Mind-map labels were cut off (\### 1.6.0 — 2026-11-12

**Improvements**
- Clicking a note in All notes opens it in the same window instead of a new small window, saving first. If that note is already open elsewhere, that window comes forward.
- All notes shows a two-line content preview (Markdown markers removed, to-dos as ☐/☑); search matches previews too; the current note is outlined.

**Maintenance**
- Added 2 tests; all 50 pass.

### 1.5.0 — 2026-11-11

**Features**
- Nested numbered lists show hierarchical numbers 1. / 1.1 / 2.1.1, also on mind-map nodes. Numbers update with every insert, indent and drag; display only, the file stays standard Markdown.

**Maintenance**
- Added 2 tests; all 49 pass.

### 1.4.2 — 2026-11-11

**Fixes**
- The × button sometimes failed to close a window: during an IME composition (common with Chinese input, and it can stick after focus is lost) saving waited indefinitely, the close was cancelled and the window faded back in. Closing now saves the text as shown and closes; an open mind-map label edit is committed first. Only a real save error keeps the window open, with a status message.

### 1.4.1 — 2026-11-11

**Fixes**
- Mind-map zoom was choppy: each step rebuilt the whole map and relaid it out with CSS zoom. Zoom now uses a GPU transform eased per frame, anchored at the cursor, with continuous trackpad pinch; text re-sharpens when zooming stops. Node fade-in plays only when the map first opens.

### 1.4.0 — 2026-11-11

**Features**
- Set the note title in the title bar. It is saved as the first # heading and names the note in All notes and the mind-map root.
- New notes start dark; existing notes keep their tone.
- In mind-map view the toolbar shows ＋ Child / ＋ Sibling / Rename / Delete buttons.

**Fixes**
- Double-click did not edit map nodes: the pointer capture used for dragging retargeted dblclick to the canvas. Drag tracking now listens on the document, and clicking a node twice or typing on a selected node also starts editing.

**Maintenance**
- Added 3 tests; all 45 pass.

### 1.3.0 — 2026-11-11

**Features**
- Editable mind map: Tab adds a child, Enter a sibling, double-click/F2 renames, Delete removes a branch, Space folds, arrow keys select, task checkboxes toggle.
- Drag nodes to move them: onto a node to nest, onto its top/bottom edge to reorder. Heading sections move whole and take the new level.
- Drag the background to pan, Ctrl+wheel to zoom, Ctrl+Z / Ctrl+Y to undo and redo.
- Map edits are ordinary document edits: they autosave as Markdown and update the outline at once.

**Maintenance**
- Added 8 mind-map editing tests; all 43 pass.

### 1.2.0 — 2026-11-11

**Features**
- Light/dark switch in the title bar (Ctrl+Shift+L). It mirrors the current tone so the shade carries over; mid tones jump to pure white or black so every press flips. Each note keeps its choice; the Tone slider still fine-tunes.

**Maintenance**
- Added 2 tests; all 35 pass.

### 1.1.0 — 2026-11-11

**Features**
- Outliner-style folding: headings fold their section, list items with children fold their sub-list. Ctrl+Up/Down fold or open the branch at the caret, with Shift for everything. Moving the caret into folded content opens it.
- Automatic heading size: the H button picks the level from context (first heading H1, later ones match the section above); Tab / Shift+Tab on a heading moves it down / up a level. H3–H6 sizes now step down clearly.
- One-click mind map view (map button or Ctrl+Shift+M): the H1 is the root, headings and lists branch out. Click to fold, double-click to jump back to the outline, Ctrl+= / − / 0 to zoom. Both views share folds; each note remembers its last view.
- Folding and switching views only change the display and never rewrite the Markdown file.

**Maintenance**
- Added 10 outline and mind-map tests; all 33 pass.

### 1.0.1 — 2026-10-31

**Fixes**
- New Markdown notes created while the app is running now appear in All notes within about one second, even when the list is already open.
- External changes refresh clean windows; externally deleted files no longer break loading of the whole list.
- Conflicting external edits and unsaved typing retain both versions: the external file is preserved and local typing becomes a new note marked Local copy.
- Automatic formatting during editor initialization or selection restoration no longer counts as user editing, preventing files from being rewritten merely by opening them.

**Maintenance**
- Added file-sync and concurrent-edit regressions; all 23 tests passed.
- Builds now use a separate `release/` directory so packaging does not touch installed user data.
- Established GitHub source, development-log and versioned-release workflows. Release archives exclude personal notes.

Relaunch once after installing this fix to load the new code. Subsequent note creation and edits do not require a restart.

### 1.0.0 — 2026-10-26

First local version: instant Markdown formatting, Tab indentation, list continuation, to-do checkboxes, multiple windows, always-on-top, grayscale themes and local autosave.
