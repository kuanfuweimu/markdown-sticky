import { Editor } from '@tiptap/core';
import { richExtensions, requiresSource } from './editors.js';
import { clampTone, palette, flipTone } from './tone.js';
import { autoHeadingLevel, getFolds, setFolds, outlineKey } from './outline.js';
import { MindmapView } from './mindmap-view.js';

const $ = id => document.getElementById(id);
let note, rich, content = '', dirty = false, saveTimer, list = [], escapeTab = false, readOnly = false;
let editVersion = 0, syncing = false, syncAgain = false, applyingFile = false, unsubscribe;
let view = 'outline', mapFrame = 0;
const api = window.notes;
const EASE_OUT = 'cubic-bezier(.2,.9,.25,1)';
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function play(el, frames, options) { if (el?.animate && !reducedMotion()) el.animate(frames, options); }
// Resolves on the element's own animationend, with a timeout because reduced motion, hidden windows and jsdom may never fire it.
function afterAnimation(el, ms) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; el.removeEventListener('animationend', onEnd); resolve(); };
    const onEnd = e => { if (e.target === el) finish(); };
    el.addEventListener('animationend', onEnd);
    setTimeout(finish, reducedMotion() ? 0 : ms);
  });
}
const isOpen = el => !el.hidden && !el.classList.contains('leaving');
function reveal(el) { el.classList.remove('leaving'); el.hidden = false; }
async function dismiss(el) {
  if (!isOpen(el)) return;
  el.classList.add('leaving');
  await afterAnimation(el, 240);
  if (el.classList.contains('leaving')) { el.hidden = true; el.classList.remove('leaving'); }
}
function shake(el) { play(el, [0, -6, 5, -3, 2, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 360, easing: 'ease-out' }); }
function status(message, error = false) {
  const el = $('status');
  if (el.textContent !== message) play(el, [{ opacity: .35 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT });
  el.textContent = message; el.classList.toggle('error', error);
}
function applyTone(el, tone) {
  const { dark, vars } = palette(tone);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty('--' + k, v);
  el.style.colorScheme = dark ? 'dark' : 'light';
}
function setTone(tone) {
  note.tone = clampTone(tone);
  applyTone(document.body, note.tone);
  $('tone').value = note.tone; $('toneValue').textContent = note.tone + '%';
  document.querySelectorAll('[data-tone]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tone) === note.tone)));
  const dark = palette(note.tone).dark, theme = $('theme');
  theme.classList.toggle('isDark', dark); theme.setAttribute('aria-pressed', String(dark));
  theme.title = dark ? 'Light mode · Ctrl+Shift+L' : 'Dark mode · Ctrl+Shift+L'; theme.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode');
}
function toggleTheme() {
  if (!note) return;
  setTone(flipTone(note.tone)); saveTone(0);
  play($('theme').firstElementChild, [{ transform: 'rotate(-90deg) scale(.6)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE_OUT });
}
let toneTimer;
function saveTone(delay) { clearTimeout(toneTimer); toneTimer = setTimeout(() => api.meta({ tone: note.tone }).catch(report), delay); }
function changed(md) { content = md; dirty = true; editVersion++; status('Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 350); }
// `force` is for closing and leaving: an IME composition (sometimes stuck after the window loses focus) must not
// block the save, so the text as currently shown is saved instead of waiting for the composition to end.
function flush(force = false) {
  clearTimeout(saveTimer);
  if (rich?.view.composing) {
    if (!force) { saveTimer = setTimeout(flush, 350); return false; }
    const md = rich.getMarkdown();
    if (md !== content) { content = md; dirty = true; }
  }
  if (!dirty) return true;
  const result = api.save(content, note.revision);
  if (result.ok) {
    dirty = false; editVersion++;
    note.id = result.id || note.id; note.revision = result.revision || note.revision;
    status(result.conflict ? 'External edit kept; your changes saved as a separate note' : 'Saved locally');
    return true;
  }
  status('Save failed: ' + result.error, true); return false;
}
function renderEditor(focus = true) {
  // The editor cannot round-trip tables, images or HTML, so such notes are shown read-only to keep the file intact.
  readOnly = requiresSource(content);
  applyingFile = true;
  try {
    rich = new Editor({ element: $('rich'), extensions: richExtensions(), content, contentType: 'markdown', editable: !readOnly,
      editorProps: { attributes: { 'aria-label': 'Note', spellcheck: 'false' } },
      onUpdate: ({ editor, transaction }) => { if (!applyingFile && transaction.docChanged) changed(editor.getMarkdown()); },
      onTransaction: ({ transaction }) => {
        if (transaction.docChanged) syncTitle();
        if (view === 'mindmap' && (transaction.docChanged || transaction.getMeta(outlineKey))) scheduleMap();
      },
    });
    if (focus && !readOnly && view === 'outline') rich.commands.focus('end');
  } finally { applyingFile = false; }
  updateChrome();
  if (view === 'mindmap') drawMindmap();
}
function updateChrome() {
  const map = view === 'mindmap';
  document.querySelector('.formatTools').hidden = map; document.querySelector('.mapTools').hidden = !map;
  document.querySelectorAll('[data-map]').forEach(b => b.disabled = readOnly);
  $('docTitle').readOnly = readOnly;
  syncTitle();
  document.querySelectorAll('[data-format]').forEach(b => b.disabled = readOnly || map);
  $('viewToggle').setAttribute('aria-pressed', String(map)); $('viewToggle').classList.toggle('active', map);
  $('viewToggle').title = map ? 'Back to outline · Ctrl+Shift+M' : 'Mind map · Ctrl+Shift+M';
  $('hint').textContent = map ? (readOnly ? 'Read-only note · Wheel to zoom · Drag the background to move' : 'Wheel zoom · Tab child · Enter sibling · Double-click edit')
    : readOnly ? 'Has tables, images or HTML: read-only to keep it intact' : 'Tab to indent · Ctrl+↑/↓ to fold';
}
function scheduleMap() { if (!mapFrame) mapFrame = requestAnimationFrame(() => { mapFrame = 0; if (view === 'mindmap') drawMindmap(); }); }
let mindmap;
function drawMindmap() {
  if (!rich) return;
  mindmap ||= new MindmapView($('mindmap'), { editor: () => rich, readOnly: () => readOnly, onOpen: pos => setView('outline', pos) });
  mindmap.render();
}
// Switching views keeps one editor and one fold state, so the outline and the map always show the same branches.
function setView(next, pos) {
  if (!rich) return;
  if (next === view && pos == null) return;
  view = next;
  const map = view === 'mindmap';
  $('mindmap').hidden = !map; $('rich').hidden = map;
  updateChrome();
  play(map ? $('mindmap') : $('rich'), [{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE_OUT });
  if (map) { drawMindmap(); $('mindmap').focus({ preventScroll: true }); }
  else {
    $('mindmap').replaceChildren();
    if (pos != null) {
      const limit = rich.state.doc.content.size;
      rich.commands.setTextSelection(Math.min(pos + 1, limit));
      // Moving the caret into a folded branch opens it; scroll after the decorations update.
      requestAnimationFrame(() => rich.commands.scrollIntoView());
    }
    if (!readOnly) rich.commands.focus(undefined, { scrollIntoView: pos != null });
  }
  if (note) api.meta?.({ view })?.catch?.(report);
}
async function synchronize() {
  if (!note) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    do {
      syncAgain = false;
      if (isOpen($('drawer'))) await refreshList();
      // An open map label edit counts as unsaved typing.
      if (dirty || rich?.view.composing || mindmap?.editing) continue;
      const version = editVersion, id = note.id;
      const latest = await api.load();
      // Input can arrive while IPC is pending. A late reload must not discard it.
      if (dirty || rich?.view.composing || mindmap?.editing || version !== editVersion || id !== note.id) continue;
      if (latest.content !== content) {
        const focused = rich.isFocused, selection = rich.state.selection, scroll = $('editorArea').scrollTop;
        // Keep folds whose position still starts a foldable block after an external edit.
        const folds = getFolds(rich.state);
        rich.destroy(); $('rich').replaceChildren();
        content = latest.content; note = latest;
        renderEditor(false);
        setFolds(rich, folds);
        if (focused && !readOnly) {
          const limit = rich.state.doc.content.size;
          rich.commands.setTextSelection({ from: Math.min(selection.from, limit), to: Math.min(selection.to, limit) });
          rich.commands.focus(undefined, { scrollIntoView: false });
        }
        $('editorArea').scrollTop = scroll;
        status('Updated from file');
      } else note = latest;
    } while (syncAgain);
  } catch (error) {
    if (!dirty) status('File unavailable; your open text is kept. ' + (error.message || error), true);
  } finally { syncing = false; }
}
async function closeHelp() {
  const dialog = $('helpDialog');
  if (!dialog.open || dialog.classList.contains('leaving')) return;
  dialog.classList.add('leaving');
  await afterAnimation(dialog, 240);
  dialog.classList.remove('leaving'); dialog.close();
}
function format(kind) {
  if (!rich || readOnly || view === 'mindmap') { shake($('editorArea')); return; }
  const chain = rich.chain().focus();
  ({ heading: () => rich.isActive('heading') ? chain.setParagraph().run() : chain.setHeading({ level: autoHeadingLevel(rich.state) }).run(), bold: () => chain.toggleBold().run(), bullet: () => chain.toggleBulletList().run(), ordered: () => chain.toggleOrderedList().run(), task: () => chain.toggleTaskList().run() })[kind]();
}
async function refreshList(animate = false) { list = await api.list(); drawList(animate); }
// Puts a note into this window: the first load, or switching notes from All notes without opening a new window.
function showNote(data, first = false) {
  if (rich) { rich.destroy(); $('rich').replaceChildren(); }
  if (mindmap) { mindmap.editing = null; $('mindmap').replaceChildren(); mindmap.selected = null; }
  note = data; content = note.content; dirty = false; editVersion++;
  setTone(note.tone); $('pin').classList.toggle('active', !!note.pinned); $('pin').setAttribute('aria-pressed', String(!!note.pinned));
  view = note.view === 'mindmap' ? 'mindmap' : 'outline';
  $('mindmap').hidden = view !== 'mindmap'; $('rich').hidden = view === 'mindmap';
  renderEditor(first || view === 'outline');
  $('editorArea').classList.remove('swap-in'); void $('editorArea').offsetWidth; $('editorArea').classList.add('swap-in');
  status('Saved locally');
}
async function openFromList(id) {
  if (note && id === note.id) { dismiss($('drawer')); return; }
  if (!prepareClose()) return;
  const data = await api.switch(id);
  dismiss($('drawer'));
  if (data) showNote(data);
}
function drawList(animate = false) {
  const term = $('search').value.toLowerCase();
  const items = list.filter(n => !!n.archived === $('showArchived').checked && (n.title + ' ' + (n.preview || '')).toLowerCase().includes(term));
  $('noteList').replaceChildren();
  $('noteList').classList.toggle('stagger', animate);
  for (const [i, n] of items.entries()) {
    const button = document.createElement('button'); button.className = 'noteCard' + (note && n.id === note.id ? ' current' : ''); applyTone(button, n.tone); button.style.setProperty('--i', i);
    const title = document.createElement('strong'); title.textContent = n.title;
    const preview = document.createElement('p'); preview.className = 'preview'; preview.textContent = n.preview || 'Empty note';
    if (!n.preview) preview.classList.add('empty');
    const detail = document.createElement('span'); detail.textContent = `${new Date(n.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${note && n.id === note.id ? ' · Open here' : ''}${n.archived ? ' · Click to restore' : ''}`;
    button.append(title, preview, detail); button.onclick = () => openFromList(n.id).catch(report); $('noteList').append(button);
  }
  if (!items.length) $('noteList').textContent = 'No notes here yet.';
}
function report(error) { status(error.message || String(error), true); }
function bind(id, fn) { $(id).onclick = () => Promise.resolve().then(fn).catch(report); }
bind('new', () => { if (flush()) return api.new(); });
bind('pin', async () => {
  note.pinned = !note.pinned; await api.meta({ pinned: note.pinned });
  $('pin').classList.toggle('active', note.pinned); $('pin').setAttribute('aria-pressed', String(note.pinned));
  play($('pin').firstElementChild, [{ transform: 'scale(1)' }, { transform: 'scale(.78)', offset: .3 }, { transform: 'scale(1.1)', offset: .7 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
});
bind('minimize', () => api.minimize());
bind('viewToggle', () => setView(view === 'mindmap' ? 'outline' : 'mindmap'));
bind('theme', toggleTheme);
// Closing finishes any open map label edit and saves whatever is on screen; only a real save error keeps the window open.
function prepareClose() { if (mindmap?.editing) mindmap.finishEdit(true, null, false); return flush(true); }
bind('close', () => { if (prepareClose()) return api.close(); shake($('status')); });
bind('more', () => isOpen($('menu')) ? dismiss($('menu')) : reveal($('menu')));
bind('library', async () => { if (!flush()) return; dismiss($('menu')); await refreshList(true); reveal($('drawer')); $('search').focus(); });
bind('drawerClose', () => dismiss($('drawer')));
bind('folder', () => api.folder());
bind('import', () => api.import());
bind('export', async () => { if (flush() && await api.export()) status('Exported .md file'); });
bind('archive', () => { if (prepareClose()) return api.archive(); });
bind('help', () => { dismiss($('menu')); $('helpDialog').showModal(); });
bind('helpClose', closeHelp);
$('helpDialog').addEventListener('cancel', e => { e.preventDefault(); closeHelp(); });
$('search').oninput = () => drawList(); $('showArchived').onchange = () => refreshList(true).catch(report);
document.querySelectorAll('[data-format]').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => format(b.dataset.format); });
document.querySelectorAll('[data-map]').forEach(b => {
  b.onmousedown = e => e.preventDefault();
  b.onclick = () => { if (!mindmap) return; ({ child: () => mindmap.add('child'), sibling: () => mindmap.add('sibling'), edit: () => mindmap.startEdit(mindmap.selected), delete: () => mindmap.remove() })[b.dataset.map](); };
});
// The title is the note's opening H1: typing here creates, renames or (when cleared) removes that heading.
function titleNode() { const first = rich?.state.doc.firstChild; return first?.type.name === 'heading' && first.attrs.level === 1 ? first : null; }
function syncTitle() {
  const input = $('docTitle');
  if (document.activeElement !== input) input.value = titleNode()?.textContent || '';
  document.title = (input.value.trim() || 'Untitled') + ' · Markdown Sticky';
}
function setTitle(text) {
  if (!rich || readOnly) return;
  text = text.replace(/\s+/g, ' ').trim();
  const head = titleNode(), { state } = rich, tr = state.tr;
  if (head) {
    if (head.textContent === text) return;
    if (text) tr.insertText(text, 1, 1 + head.content.size); else tr.delete(0, head.nodeSize);
  } else if (text) tr.insert(0, state.schema.nodes.heading.create({ level: 1 }, state.schema.text(text)));
  if (tr.docChanged) rich.view.dispatch(tr);
}
$('docTitle').addEventListener('input', () => setTitle($('docTitle').value));
$('docTitle').addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); if (view === 'mindmap') $('mindmap').focus(); else rich?.commands.focus('start'); }
});
$('docTitle').addEventListener('blur', syncTitle);
document.querySelectorAll('[data-tone]').forEach(b => { b.style.background = palette(b.dataset.tone).vars.paper; b.onclick = () => { setTone(b.dataset.tone); saveTone(0); }; });
$('tone').oninput = () => { document.body.classList.add('scrubbing'); setTone($('tone').value); saveTone(250); };
$('tone').onchange = () => { document.body.classList.remove('scrubbing'); saveTone(0); };
document.addEventListener('click', e => {
  if (!$('menu').contains(e.target) && !$('more').contains(e.target)) dismiss($('menu'));
  const link = e.target.closest('a'); if (link) { e.preventDefault(); if (readOnly || e.ctrlKey) api.external(link.getAttribute('href')).catch(report); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { escapeTab = true; dismiss($('menu')); dismiss($('drawer')); return; }
  if (e.key === 'Tab' && escapeTab) { escapeTab = false; e.preventDefault(); e.stopImmediatePropagation(); document.querySelector('[data-format]').focus(); return; }
  escapeTab = false;
  if (e.isComposing || !(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === 'n') { e.preventDefault(); if (flush()) api.new().catch(report); }
  else if (key === 's') { e.preventDefault(); flush(); }
  else if (key === 'b') { e.preventDefault(); e.stopPropagation(); format('bold'); }
  else if (key === 'm' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); setView(view === 'mindmap' ? 'outline' : 'mindmap'); }
  else if (key === 'l' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); toggleTheme(); }
  else if (view === 'mindmap' && (key === '=' || key === '+' || key === '-' || key === '0')) { e.preventDefault(); if (mindmap) { if (key === '0') mindmap.setZoom(1); else mindmap.zoomBy(key === '-' ? 1 / 1.2 : 1.2); } }
}, true);
window.addEventListener('beforeunload', e => { if (!prepareClose()) { e.preventDefault(); e.returnValue = false; } });
window.addEventListener('blur', flush);
window.addEventListener('focus', synchronize);
document.addEventListener('compositionend', () => { if (!dirty) synchronize(); });
window.addEventListener('unload', () => { unsubscribe?.(); clearTimeout(saveTimer); });
document.addEventListener('change', e => {
  if (e.target.matches?.('input[type=checkbox]')) play(e.target, e.target.checked
    ? [{ transform: 'scale(.7)' }, { transform: 'scale(1.18)', offset: .6 }, { transform: 'scale(1)' }]
    : [{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
});
api.load().then(data => {
  showNote(data, true);
  unsubscribe = api.onChanged?.(synchronize);
  synchronize();
}).catch(report);
