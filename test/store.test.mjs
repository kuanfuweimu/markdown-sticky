import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NoteStore } from '../store.cjs';
const root = path.resolve('test-data-' + process.pid);
test('save, backup, restart, metadata, archive and restore', () => {
  const store = new NoteStore(root); const note = store.create('rich','# 中文\n\n1. 第一');
  assert.equal(note.tone,100,'new notes start dark');
  store.save(note.id, '# 更新\n\n- [x] 完成');
  assert.equal(fs.readFileSync(store.file(note.id)+'.bak','utf8'),'# 中文\n\n1. 第一');
  store.update(note.id,{tone:140,pinned:true,archived:true,view:'mindmap'});
  store.update(note.id,{view:'bogus'});
  const restart = new NoteStore(root);
  assert.equal(restart.read(note.id).view,'mindmap');
  assert.equal(restart.read(note.id).content,'# 更新\n\n- [x] 完成');
  assert.equal(restart.list()[0].archived,true);
  assert.equal(restart.list()[0].preview,'☑ 完成','list shows a plain-text preview');
  assert.equal(restart.list()[0].tone,100);
  restart.update(note.id,{archived:false}); assert.equal(restart.list()[0].archived,false);
  assert.throws(() => restart.read('../../bad'));
  assert.throws(() => restart.save(note.id,{}));
});
test('corrupt index can recover Markdown files without removing content', () => {
  fs.writeFileSync(path.join(root,'index.json'),'{bad');
  const restart = new NoteStore(root); assert.equal(restart.list().length,1); assert.match(restart.read(restart.list()[0].id).content,/# 更新/);
});
test.after(() => { if (path.dirname(root) !== process.cwd() || !path.basename(root).startsWith('test-data-')) throw new Error('Unsafe cleanup path'); fs.rmSync(root,{recursive:true,force:true}); });
