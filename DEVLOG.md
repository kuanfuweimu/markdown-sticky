# 开发日志

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
