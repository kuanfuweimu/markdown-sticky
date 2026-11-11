# 更新日志

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
