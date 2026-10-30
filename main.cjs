const { app, BrowserWindow, ipcMain, dialog, shell, screen, systemPreferences } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { NoteStore } = require('./store.cjs');
const root = path.join(app.isPackaged ? path.dirname(process.execPath) : __dirname, 'data');
fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
app.setPath('userData', path.join(root, 'runtime'));
app.setPath('sessionData', path.join(root, 'runtime'));
app.setPath('crashDumps', path.join(root, 'runtime', 'crashes'));
const APP_ID = 'studio.weimu.markdownsticky';
app.setAppUserModelId(APP_ID);
let store, stopWatching;
const windows = new Map();
function notifyNotesChanged() {
  for (const win of windows.values()) if (!win.isDestroyed()) win.webContents.send('notes-changed');
}
function refreshNotes() { if (store.sync().length) notifyNotesChanged(); }
const welcome = () => `# Sticky\n\nJust write. Headings and lists format themselves as you type.\n\n## Try lists and indenting\n\n1. Put the cursor at the end of this line and press Enter\n2. Press Tab on an item to nest it\n3. Press Shift+Tab to move it back out\n\n- [ ] Write down the most important thing for today\n- [ ] Open ⋯ and drag the tone slider to shade this note\n- [x] Everything saves automatically as .md\n\nPress Enter on an empty item to end a list.\n\n**Ctrl+N** new note · **Ctrl+S** save\n\nUse the buttons at the top right to keep a note on top or see all notes.`;
const toneHex = tone => { const v = Math.round((100 - Math.max(0, Math.min(100, Number(tone) || 0))) * 2.55).toString(16).padStart(2, '0'); return '#' + v + v + v; };
// Keeps a Start menu entry pointing at this copy of the app, with the AppUserModelID so pinned tiles and taskbar windows group together.
function ensureStartMenuShortcut() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  const link = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Markdown Sticky.lnk');
  const icon = path.join(process.resourcesPath, 'icon.ico');
  const wanted = { target: process.execPath, cwd: path.dirname(process.execPath), appUserModelId: APP_ID, description: 'Markdown sticky notes', ...(fs.existsSync(icon) && { icon, iconIndex: 0 }) };
  try {
    if (fs.existsSync(link)) {
      const current = shell.readShortcutLink(link);
      if (current.target === wanted.target && current.appUserModelId === APP_ID && (current.icon || '') === (wanted.icon || '')) return;
      shell.writeShortcutLink(link, 'update', wanted);
    } else shell.writeShortcutLink(link, 'create', wanted);
  } catch {}
}
const animated = () => { try { return !systemPreferences.getAnimationSettings().prefersReducedMotion; } catch { return true; } };
function fade(win, to, ms) {
  return new Promise(resolve => {
    if (win.isDestroyed()) return resolve();
    const from = win.getOpacity(), start = Date.now();
    if (!animated()) { win.setOpacity(to); return resolve(); }
    const tick = () => {
      if (win.isDestroyed()) return resolve();
      const t = Math.min(1, (Date.now() - start) / ms);
      const eased = to > from ? 1 - (1 - t) ** 3 : t * t;
      win.setOpacity(from + (to - from) * eased);
      if (t < 1) setTimeout(tick, 8); else resolve();
    };
    tick();
  });
}
async function fadeClose(win) {
  if (win.fading) return;
  win.fading = true;
  await fade(win, 0, 140);
  if (win.isDestroyed()) return;
  win.allowClose = true; win.close();
  // beforeunload in the renderer can still cancel the close; bring the window back if it survives.
  setTimeout(() => { if (!win.isDestroyed()) { win.allowClose = false; win.fading = false; fade(win, 1, 160); } }, 400);
}
function openNote(id) {
  if (windows.has(id)) { const w = windows.get(id); if (w.isMinimized()) w.restore(); w.show(); w.focus(); return; }
  const note = store.read(id);
  let bounds = note.bounds || { width: 450, height: 590 };
  if (bounds.x !== undefined && !screen.getAllDisplays().some(d => bounds.x < d.workArea.x + d.workArea.width && bounds.x + bounds.width > d.workArea.x && bounds.y < d.workArea.y + d.workArea.height && bounds.y + bounds.height > d.workArea.y)) bounds = { width: 450, height: 590 };
  const win = new BrowserWindow({ ...bounds, minWidth: 340, minHeight: 300, frame: false, show: false,
    backgroundColor: toneHex(note.tone), title: 'Markdown Sticky', autoHideMenuBar: true, alwaysOnTop: !!note.pinned,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false } });
  windows.set(id, win); win.noteId = id;
  win.loadFile('index.html');
  win.once('ready-to-show', () => { win.setOpacity(0); win.show(); fade(win, 1, 180); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.on('close', event => {
    if (!win.allowClose) { event.preventDefault(); fadeClose(win); return; }
    try { store.update(win.noteId, { bounds: win.getBounds() }); } catch {}
  });
  win.on('closed', () => windows.delete(win.noteId));
  win.on('focus', () => { try { refreshNotes(); } catch (error) { console.error('Note refresh failed:', error.message); } });
}
function launch() {
  const notes = store.list().filter(n => !n.archived);
  if (notes.length) openNote(notes[0].id);
  else openNote(store.create('rich', welcome()).id);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', launch);
  app.whenReady().then(() => {
    store = new NoteStore(root);
    const sender = e => { const w = BrowserWindow.fromWebContents(e.sender); if (!w || !w.noteId) throw new Error('Invalid window'); return w; };
    ipcMain.handle('load', e => { const w = sender(e); refreshNotes(); return store.read(w.noteId); });
    ipcMain.on('save', (e, content, revision) => {
      try {
        const w = sender(e), previousId = w.noteId;
        const saved = store.save(previousId, content, revision);
        if (saved.id !== previousId) { windows.delete(previousId); w.noteId = saved.id; windows.set(saved.id, w); }
        e.returnValue = { ok: true, id: saved.id, revision: saved.revision, conflict: saved.id !== previousId };
        notifyNotesChanged();
      }
      catch (error) { e.returnValue = { ok: false, error: error.message }; }
    });
    ipcMain.handle('meta', (e, patch) => {
      const w = sender(e); const meta = store.update(w.noteId, patch);
      w.setAlwaysOnTop(!!meta.pinned); notifyNotesChanged(); return meta;
    });
    ipcMain.handle('list', e => { sender(e); refreshNotes(); return store.list(); });
    ipcMain.handle('new', e => { sender(e); openNote(store.create('rich').id); notifyNotesChanged(); });
    ipcMain.handle('open', (e, id) => { sender(e); refreshNotes(); store.update(id, { archived: false }); openNote(id); notifyNotesChanged(); });
    ipcMain.handle('minimize', e => sender(e).minimize());
    ipcMain.handle('close', e => sender(e).close());
    ipcMain.handle('folder', e => { sender(e); return shell.openPath(path.join(root, 'notes')); });
    ipcMain.handle('export', async e => {
      const w = sender(e); const n = store.read(w.noteId);
      const title = store.list().find(n => n.id === w.noteId).title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 60);
      const result = await dialog.showSaveDialog(w, { title: 'Export Markdown', defaultPath: path.join(root, title + '.md'), filters: [{ name: 'Markdown', extensions: ['md'] }] });
      if (!result.canceled) { fs.writeFileSync(result.filePath, n.content, 'utf8'); return true; } return false;
    });
    ipcMain.handle('import', async e => {
      const w = sender(e); const result = await dialog.showOpenDialog(w, { title: 'Import Markdown', defaultPath: root, filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }], properties: ['openFile'] });
      if (!result.canceled) { const file = result.filePaths[0]; if (fs.statSync(file).size > 5000000) throw new Error('Choose a file smaller than 5 MB'); openNote(store.create('rich', fs.readFileSync(file, 'utf8')).id); notifyNotesChanged(); }
    });
    ipcMain.handle('archive', e => { const w = sender(e); store.update(w.noteId, { archived: true }); w.close(); notifyNotesChanged(); });
    ipcMain.handle('external', (e, url) => { sender(e); if (typeof url === 'string' && /^https?:\/\//i.test(url)) return shell.openExternal(url); });
    launch();
    stopWatching = store.watch(notifyNotesChanged, { onError: error => console.error('Note refresh failed:', error.message) });
    ensureStartMenuShortcut();
  }).catch(error => { dialog.showErrorBox('Markdown Sticky could not start', error.message); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => stopWatching?.());
