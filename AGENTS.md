# Markdown Sticky maintenance

- This is the source for the user's existing Markdown Sticky desktop app. Inspect the current app/source state and preserve the user's notes before changing or installing anything.
- Do not use desktop/browser UI automation, screenshots, mouse or keyboard simulation on the user's computer. Use code, CLI, file operations and isolated tests.
- Keep development files, backups and release assets on D: when working on the user's Windows computer.
- User preference confirmed on 2026-10-31: after every software update, increment the appropriate version, update CHANGELOG.md and DEVLOG.md, run the relevant tests, commit and push the source to GitHub, and publish a versioned GitHub Release with the Windows build and release notes. Keep the existing repository visibility unless the user requests a change.
- Repository: https://github.com/kuanfuweimu/markdown-sticky. Do not silently switch repositories or discard another collaborator's changes.
- Never commit or upload personal note content, data/index.json, runtime caches, login credentials, or machine-specific private paths. Use synthetic fixtures in tests and logs.
- Build into release/, never into an installed app folder containing data/. A release archive must not contain a data/ directory. Back up the installed program and notes before replacing app resources.
- An update may require a one-time relaunch to load new code. Do not force-kill the running app or risk unsaved text. Clearly distinguish source/build completion, installation, and activation.
- Maintain live discovery of UUID-named Markdown files, automatic list updates, and revision checks that preserve both versions when external changes conflict with unsaved typing.
