# Markdown Sticky maintenance

- This is the source for the user's existing Markdown Sticky desktop app. Inspect the current app/source state and preserve the user's notes before changing or installing anything.
- Do not use desktop/browser UI automation, screenshots, mouse or keyboard simulation on the user's computer. Use code, CLI, file operations and isolated tests.
- Keep development files, backups and release assets on D: when working on the user's Windows computer.
- User preference confirmed on 2026-10-31: after every software update, increment the appropriate version, update CHANGELOG.md and DEVLOG.md, run the relevant tests, commit and push the source to GitHub, and publish a versioned GitHub Release with the Windows build and release notes. Keep the existing repository visibility unless the user requests a change.
- Repository: https://github.com/kuanfuweimu/markdown-sticky. Do not silently switch repositories or discard another collaborator's changes.
- Never commit or upload personal note content, data/index.json, runtime caches, login credentials, or machine-specific private paths. Use synthetic fixtures in tests and logs.
- Build into release/, never into an installed app folder containing data/. A release archive must not contain a data/ directory. Back up the installed program and notes before replacing app resources.
- An update may require a one-time relaunch to load new code. Do not force-kill the running app or risk unsaved text. Clearly distinguish source/build completion, installation, and activation.
- App rule (user, 2026-11-12): every list item — numbered, bullet or to-do — shows a hierarchical number (1. / 1.1 / 1.1.1) in both the outline and the mind map. Never remove or bypass this; numbers are display-only and the Markdown stays standard.
- Maintain live discovery of UUID-named Markdown files, automatic list updates, and revision checks that preserve both versions when external changes conflict with unsaved typing.

---

## 中文维护规则

- 这是用户现有 Markdown Sticky 桌面应用的源码。修改或安装前检查当前应用及源码，保留用户便签。
- 不使用桌面/浏览器 UI 自动化、截图、鼠标或键盘模拟；使用代码、CLI、文件和隔离测试。
- 在用户 Windows 电脑工作时，开发文件、备份与发布资产按本仓库原规则保存在 D 盘；当前会话明确指定位置时以用户指令优先。
- 2026-10-31 用户确认：每次软件更新后递增适当版本，更新 CHANGELOG.md 和 DEVLOG.md，运行相关测试，提交推送并发布包含 Windows 构建与说明的版本化 GitHub Release。除非用户要求，不改变仓库可见性。
- 仓库为 https://github.com/kuanfuweimu/markdown-sticky；不得悄悄切换仓库或丢弃其他协作者修改。
- 不提交或上传个人便签、data/index.json、运行缓存、登录凭据或机器特定私有路径。测试与日志使用合成数据。
- 构建到 release/，不构建到包含 data/ 的安装目录。发布包不能含 data/；替换应用资源前备份程序与便签。
- 更新可能需要重开一次来加载代码，不强杀应用或危及未保存文字。区分源码/构建完成、安装完成及实际生效。
- 应用铁律（用户，2026-11-12）：所有列表项（编号、项目符号、待办）在大纲和思维导图中都显示层级编号（1. / 1.1 / 1.1.1），不得移除或绕过；编号只影响显示，Markdown 保持标准格式。
- 保留 UUID Markdown 自动发现、列表自动更新及修订检查；外部修改与未保存输入冲突时必须保留两份。
