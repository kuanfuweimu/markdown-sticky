import { Editor } from '@tiptap/core';
import { richExtensions, requiresSource } from './editors.js';
import { clampTone, palette } from './tone.js';

const $ = id => document.getElementById(id);
let note, rich, content = '', dirty = false, saveTimer, list = [], escapeTab = false, readOnly = false;
let editVersion = 0, syncing = false, syncAgain = false, applyingFile = false, unsubscribe;
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
}
let toneTimer;
function saveTone(delay) { clearTimeout(toneTimer); toneTimer = setTimeout(() => api.meta({ tone: note.tone }).catch(report), delay); }
function changed(md) { content = md; dirty = true; editVersion++; status('Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 350); }
function flush() {
  clearTimeout(saveTimer);
  if (!dirty) return true;
  if (rich?.view.composing) { saveTimer = setTimeout(flush, 350); return false; }
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
  document.querySelectorAll('[data-format]').forEach(b => b.disabled = readOnly);
  $('hint').textContent = readOnly ? 'Has tables, images or HTML: read-only to keep it intact' : 'Tab to indent · Enter continues lists';
  applyingFile = true;
  try {
    rich = new Editor({ element: $('rich'), extensions: richExtensions(), content, contentType: 'markdown', editable: !readOnly,
      editorProps: { attributes: { 'aria-label': 'Note', spellcheck: 'false' } },
      onUpdate: ({ editor, transaction }) => { if (!applyingFile && transaction.docChanged) changed(editor.getMarkdown()); },
    });
    if (focus && !readOnly) rich.commands.focus('end');
  } finally { applyingFile = false; }
}
async function synchronize() {
  if (!note) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    do {
      syncAgain = false;
      if (isOpen($('drawer'))) await refreshList();
      if (dirty || rich?.view.composing) continue;
      const version = editVersion, id = note.id;
      const latest = await api.load();
      // Input can arrive while IPC is pending. A late reload must not discard it.
      if (dirty || rich?.view.composing || version !== editVersion || id !== note.id) continue;
      if (latest.content !== content) {
        const focused = rich.isFocused, selection = rich.state.selection, scroll = $('editorArea').scrollTop;
        rich.destroy(); $('rich').replaceChildren();
        content = latest.content; note = latest;
        renderEditor(false);
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
  if (!rich || readOnly) { shake($('editorArea')); return; }
  const chain = rich.chain().focus();
  ({ heading: () => chain.toggleHeading({ level: 2 }).run(), bold: () => chain.toggleBold().run(), bullet: () => chain.toggleBulletList().run(), ordered: () => chain.toggleOrderedList().run(), task: () => chain.toggleTaskList().run() })[kind]();
}
async function refreshList(animate = false) { list = await api.list(); drawList(animate); }
function drawList(animate = false) {
  const term = $('search').value.toLowerCase();
  const items = list.filter(n => !!n.archived === $('showArchived').checked && n.title.toLowerCase().includes(term));
  $('noteList').replaceChildren();
  $('noteList').classList.toggle('stagger', animate);
  for (const [i, n] of items.entries()) {
    const button = document.createElement('button'); button.className = 'noteCard'; applyTone(button, n.tone); button.style.setProperty('--i', i);
    const title = document.createElement('strong'); title.textContent = n.title;
    const detail = document.createElement('span'); detail.textContent = `${new Date(n.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${n.archived ? ' · Click to restore' : ''}`;
    button.append(title, detail); button.onclick = () => api.open(n.id).catch(report); $('noteList').append(button);
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
bind('close', () => { if (flush()) return api.close(); });
bind('more', () => isOpen($('menu')) ? dismiss($('menu')) : reveal($('menu')));
bind('library', async () => { if (!flush()) return; dismiss($('menu')); await refreshList(true); reveal($('drawer')); $('search').focus(); });
bind('drawerClose', () => dismiss($('drawer')));
bind('folder', () => api.folder());
bind('import', () => api.import());
bind('export', async () => { if (flush() && await api.export()) status('Exported .md file'); });
bind('archive', () => { if (flush()) return api.archive(); });
bind('help', () => { dismiss($('menu')); $('helpDialog').showModal(); });
bind('helpClose', closeHelp);
$('helpDialog').addEventListener('cancel', e => { e.preventDefault(); closeHelp(); });
$('search').oninput = () => drawList(); $('showArchived').onchange = () => refreshList(true).catch(report);
document.querySelectorAll('[data-format]').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => format(b.dataset.format); });
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
}, true);
window.addEventListener('beforeunload', e => { if (!flush()) { e.preventDefault(); e.returnValue = false; } });
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
  note = data; content = note.content;
  setTone(note.tone); $('pin').classList.toggle('active', note.pinned); $('pin').setAttribute('aria-pressed', String(!!note.pinned));
  renderEditor(); $('editorArea').classList.add('swap-in'); status('Saved locally');
  unsubscribe = api.onChanged?.(synchronize);
  synchronize();
}).catch(report);
