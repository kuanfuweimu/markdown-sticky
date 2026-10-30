import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NoteStore } from '../store.cjs';

const base = path.resolve('test-sync-data');
fs.mkdirSync(base, { recursive: true });
function fixture(t) {
  const root = fs.mkdtempSync(path.join(base, 'case-'));
  t.after(() => {
    if (path.dirname(path.resolve(root)) !== base) throw new Error('Unsafe cleanup path');
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store: new NoteStore(root), file: id => path.join(root, 'notes', id + '.md') };
}
test('a new external Markdown note appears immediately without restarting and is indexed once', t => {
  const { root, store, file } = fixture(t);
  const old = store.create('rich', '# Existing');
  store.update(old.id, { archived: true, tone: 82 });
  const id = randomUUID();
  fs.writeFileSync(file(id), '# 明日任务\n\n- [ ] 重庆光艺术节');
  assert.equal(store.list().find(n => n.id === id).title, '明日任务');
  assert.match(store.read(id).content, /重庆光艺术节/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'index.json')))[id].id, id);
  assert.equal(new NoteStore(root).list().length, 2);
  assert.equal(store.read(old.id).archived, true);
  assert.equal(store.read(old.id).tone, 82);
});
test('the live watcher detects atomic additions and edits without a list request', async t => {
  const { store, file } = fixture(t);
  const existing = store.create('rich', '# Before');
  const added = randomUUID();
  let stop;
  const observed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No live change notification')), 3000);
    t.after(() => { clearTimeout(timeout); stop?.(); });
    stop = store.watch(ids => { clearTimeout(timeout); resolve(ids); }, { interval: 30, onError: reject });
  });
  fs.writeFileSync(file(added) + '.tmp', '# New task');
  fs.renameSync(file(added) + '.tmp', file(added));
  fs.writeFileSync(file(existing.id) + '.tmp', '# Changed task');
  fs.renameSync(file(existing.id) + '.tmp', file(existing.id));
  const ids = await observed;
  assert.ok(ids.includes(added));
  assert.ok(ids.includes(existing.id));
  assert.equal(store.list().find(n => n.id === existing.id).title, 'Changed task');
});
test('simultaneous local and external edits preserve both versions and window metadata', t => {
  const { store, file } = fixture(t);
  const original = store.create('rich', '# Original');
  store.update(original.id, { tone: 82, pinned: true, bounds: { x: 10, y: 20, width: 450, height: 590 } });
  fs.writeFileSync(file(original.id), '# External change');
  const saved = store.save(original.id, '# Unsaved typing', original.revision);
  assert.notEqual(saved.id, original.id);
  assert.equal(fs.readFileSync(file(original.id), 'utf8'), '# External change');
  assert.equal(saved.content, '# Unsaved typing');
  assert.equal(saved.conflictOf, original.id);
  assert.equal(saved.tone, 82);
  assert.equal(saved.pinned, true);
  assert.equal(saved.bounds.width, 450);
  assert.match(store.list().find(n => n.id === saved.id).title, /Local copy/);
  assert.equal(store.save(saved.id, '# Continued typing', saved.revision).id, saved.id);
  assert.equal(store.list().length, 2);
});
test('matching revisions save normally and identical external content creates no duplicate', t => {
  const { store, file } = fixture(t);
  const original = store.create('rich', '# Original');
  const saved = store.save(original.id, '# Local change', original.revision);
  assert.equal(saved.id, original.id);
  assert.notEqual(saved.revision, original.revision);
  assert.equal(fs.readFileSync(file(original.id) + '.bak', 'utf8'), '# Original');
  fs.writeFileSync(file(original.id), '# Identical');
  assert.equal(store.save(original.id, '# Identical', saved.revision).id, original.id);
  assert.equal(store.list().length, 1);
});
test('missing files do not break the list and unsaved text is recovered separately', t => {
  const { store, file } = fixture(t);
  const removed = store.create('rich', '# Removed');
  const retained = store.create('rich', '# Retained');
  fs.unlinkSync(file(removed.id));
  assert.deepEqual(store.list().map(n => n.id), [retained.id]);
  const recovery = store.save(removed.id, '# Still typing', removed.revision);
  assert.notEqual(recovery.id, removed.id);
  assert.equal(recovery.content, '# Still typing');
  assert.equal(fs.existsSync(file(removed.id)), false);
});
test('background scans preserve update dates and ignore backups and temporary files', t => {
  const { root, store, file } = fixture(t);
  const note = store.create('rich', '# Stable');
  const before = fs.readFileSync(path.join(root, 'index.json'), 'utf8');
  fs.writeFileSync(file(randomUUID()) + '.tmp', '# Incomplete');
  fs.writeFileSync(file(randomUUID()) + '.bak', '# Backup');
  assert.deepEqual(store.sync(), []);
  assert.equal(store.list().length, 1);
  assert.equal(store.read(note.id).updated, note.updated);
  assert.equal(fs.readFileSync(path.join(root, 'index.json'), 'utf8'), before);
});
