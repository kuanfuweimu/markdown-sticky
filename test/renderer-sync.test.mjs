import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { NoteStore } from '../store.cjs';

const base = path.resolve('test-renderer-sync-data');
fs.mkdirSync(base, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function setup(t) {
  const root = fs.mkdtempSync(path.join(base, 'case-'));
  const store = new NoteStore(root);
  let active = store.create('rich', '# Original note'), changed;
  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost', virtualConsole: vc });
  const w = dom.window;
  w.Range.prototype.getClientRects = () => [];
  w.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.notes = {
    load: async () => store.read(active.id),
    list: async () => store.list(),
    save: (content, revision) => {
      const previous = active.id;
      active = store.save(active.id, content, revision);
      return { ok: true, id: active.id, revision: active.revision, conflict: active.id !== previous };
    },
    onChanged: callback => { changed = callback; return () => { changed = undefined; }; },
  };
  t.after(() => {
    dom.window.close();
    assert.deepEqual(errors, []);
    if (path.dirname(path.resolve(root)) !== base) throw new Error('Unsafe cleanup path');
    fs.rmSync(root, { recursive: true, force: true });
  });
  w.eval(fs.readFileSync('dist/renderer.js', 'utf8'));
  await delay(70);
  return { w, store, original: active, file: id => path.join(root, 'notes', id + '.md'), notify: () => changed(), active: () => active };
}
test('an already-open All notes list discovers a new file without reopening the drawer', async t => {
  const { w, file, notify } = await setup(t);
  w.document.getElementById('library').click(); await delay(20);
  assert.equal(w.document.getElementById('drawer').hidden, false);
  assert.equal(w.document.querySelectorAll('.noteCard').length, 1);
  const id = randomUUID(); fs.writeFileSync(file(id), '# Tomorrow tasks');
  await notify();
  assert.equal(w.document.querySelectorAll('.noteCard').length, 2);
  assert.match(w.document.getElementById('noteList').textContent, /Tomorrow tasks/);
  fs.writeFileSync(file(id), '# Renamed task');
  await notify();
  assert.match(w.document.getElementById('noteList').textContent, /Renamed task/);
  assert.doesNotMatch(w.document.getElementById('noteList').textContent, /Tomorrow tasks/);
});
test('a clean open editor reloads external text without saving the old text over it', async t => {
  const { w, original, file, notify } = await setup(t);
  fs.writeFileSync(file(original.id), '# Updated externally\n\n- [ ] New task');
  await notify();
  assert.equal(w.document.querySelector('.tiptap h1').textContent, 'Updated externally');
  assert.equal(w.document.getElementById('status').textContent, 'Updated from file');
  w.dispatchEvent(new w.Event('blur'));
  assert.equal(fs.readFileSync(file(original.id), 'utf8'), '# Updated externally\n\n- [ ] New task');
  assert.equal(fs.existsSync(file(original.id) + '.bak'), false);
});
test('dirty input survives an external edit and is saved as a separate note', async t => {
  const { w, store, original, file, notify, active } = await setup(t);
  const heading = w.document.querySelector('.tiptap h1');
  heading.textContent = 'Locally typed';
  heading.dispatchEvent(new w.InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Locally typed' }));
  await delay(30);
  assert.equal(w.document.getElementById('status').textContent, 'Saving…');
  fs.writeFileSync(file(original.id), '# External version');
  await notify();
  assert.equal(w.document.querySelector('.tiptap h1').textContent, 'Locally typed');
  w.dispatchEvent(new w.Event('blur'));
  assert.notEqual(active().id, original.id);
  assert.equal(store.read(original.id).content, '# External version');
  assert.match(store.read(active().id).content, /Locally typed/);
  assert.match(w.document.getElementById('status').textContent, /separate note/);
});
test('typing that begins while a reload is pending cannot be replaced by its stale response', async t => {
  const { w, original, file, notify, active } = await setup(t);
  fs.writeFileSync(file(original.id), '# External version');
  const currentLoad = w.notes.load;
  const snapshot = await currentLoad();
  let complete;
  w.notes.load = () => new Promise(resolve => { complete = () => resolve(snapshot); });
  const refresh = notify();
  const heading = w.document.querySelector('.tiptap h1');
  heading.textContent = 'Typed while loading';
  heading.dispatchEvent(new w.InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Typed while loading' }));
  await delay(30);
  complete(); await refresh;
  assert.equal(w.document.querySelector('.tiptap h1').textContent, 'Typed while loading');
  w.notes.load = currentLoad;
  w.dispatchEvent(new w.Event('blur'));
  assert.notEqual(active().id, original.id);
  assert.equal(fs.readFileSync(file(original.id), 'utf8'), '# External version');
});
