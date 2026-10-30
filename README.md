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
