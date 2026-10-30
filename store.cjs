const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const revisionOf = content => createHash('sha256').update(content).digest('hex');
class NoteStore {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
    this.index = path.join(root, 'index.json');
    this.meta = {};
    this.revisions = new Map();
    this.present = new Set();
    if (fs.existsSync(this.index)) {
      try { this.meta = JSON.parse(fs.readFileSync(this.index, 'utf8')); }
      catch { fs.copyFileSync(this.index, this.index + '.recovery-' + Date.now()); }
    }
    this.sync();
  }
  // Scan on demand as well as in the background. The directory is the source of
  // truth; an in-memory index must never hide a new Markdown file.
  sync() {
    const present = new Set(), changed = new Set();
    let metadataChanged = false;
    for (const name of fs.readdirSync(path.join(this.root, 'notes'))) {
      if (!/^[a-f0-9-]{36}\.md$/.test(name)) continue;
      const id = name.slice(0, -3), file = path.join(this.root, 'notes', name);
      let content, stat;
      try { stat = fs.statSync(file); if (!stat.isFile()) continue; content = fs.readFileSync(file, 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      present.add(id);
      const revision = revisionOf(content), previous = this.revisions.get(id);
      if (!this.meta[id]) {
        this.meta[id] = { id, tone: 0, mode: 'rich', pinned: false, updated: stat.mtimeMs };
        metadataChanged = true;
      } else if (previous && previous !== revision) {
        this.meta[id].updated = stat.mtimeMs;
        metadataChanged = true;
      }
      if (!this.present.has(id) || previous !== revision) changed.add(id);
      this.revisions.set(id, revision);
    }
    for (const id of this.present) if (!present.has(id)) changed.add(id);
    this.present = present;
    if (metadataChanged) this.commit();
    return [...changed];
  }
  watch(onChange, { interval = 750, onError = () => {} } = {}) {
    // Polling also handles atomic file replacement and missed Windows watch
    // events. One timer is shared by all app windows.
    const timer = setInterval(() => {
      try { const changed = this.sync(); if (changed.length) onChange(changed); }
      catch (error) { onError(error); }
    }, interval);
    timer.unref();
    return () => clearInterval(timer);
  }
  atomic(file, value) {
    const tmp = file + '.tmp';
    const fd = fs.openSync(tmp, 'w');
    try { fs.writeFileSync(fd, value, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  }
  commit() { this.atomic(this.index, JSON.stringify(this.meta, null, 2)); }
  file(id) {
    if (!/^[a-f0-9-]{36}$/.test(id) || !this.meta[id]) throw new Error('Note not found');
    return path.join(this.root, 'notes', id + '.md');
  }
  read(id) {
    this.sync();
    const content = fs.readFileSync(this.file(id), 'utf8');
    return { ...this.meta[id], content, revision: revisionOf(content) };
  }
  list() {
    this.sync();
    return Object.values(this.meta).filter(m => this.present.has(m.id)).flatMap(m => {
      let content;
      try { content = fs.readFileSync(this.file(m.id), 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return []; throw error; }
      const title = content.split(/\r?\n/).find(s => s.trim())?.replace(/^#+\s*/, '').slice(0, 70) || 'Untitled';
      return [{ ...m, title: title + (m.conflictOf ? ' · Local copy' : '') }];
    }).sort((a,b) => b.updated - a.updated);
  }
  create(mode = 'rich', content = '') {
    const id = randomUUID();
    this.meta[id] = { id, mode, tone: 0, pinned: false, updated: Date.now() };
    this.atomic(this.file(id), content);
    this.revisions.set(id, revisionOf(content)); this.present.add(id);
    this.commit(); return this.read(id);
  }
  save(id, content, expectedRevision) {
    if (typeof content !== 'string' || content.length > 5000000) throw new Error('Note is too large');
    this.sync();
    const file = this.file(id);
    let previous;
    try { previous = fs.readFileSync(file, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous === undefined || (expectedRevision && revisionOf(previous) !== expectedRevision && previous !== content)) {
      const copy = this.create(this.meta[id].mode, content);
      const { tone, pinned, bounds } = this.meta[id];
      Object.assign(this.meta[copy.id], { tone, pinned, bounds, conflictOf: id });
      this.commit();
      return this.read(copy.id);
    }
    if (previous !== content) {
      fs.copyFileSync(file, file + '.bak');
      this.atomic(file, content);
    }
    this.revisions.set(id, revisionOf(content)); this.present.add(id);
    this.meta[id].updated = Date.now(); this.commit();
    return this.read(id);
  }
  update(id, patch) {
    this.file(id);
    if (Number.isFinite(patch.tone)) this.meta[id].tone = Math.max(0, Math.min(100, Math.round(patch.tone)));
    if (['source', 'rich'].includes(patch.mode)) this.meta[id].mode = patch.mode;
    if (typeof patch.pinned === 'boolean') this.meta[id].pinned = patch.pinned;
    if (typeof patch.archived === 'boolean') this.meta[id].archived = patch.archived;
    if (patch.bounds && ['x','y','width','height'].every(k => Number.isFinite(patch.bounds[k]))) this.meta[id].bounds = patch.bounds;
    this.commit(); return this.meta[id];
  }
}
module.exports = { NoteStore };
