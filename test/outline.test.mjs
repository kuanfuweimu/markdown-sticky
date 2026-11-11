import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { richExtensions, indentRich, outdentRich } from '../src/editors.js';
import { scanOutline, getFolds, setFolds, toggleFold, foldAll, foldAtCursor, autoHeadingLevel } from '../src/outline.js';
import { mindmapTree } from '../src/mindmap.js';
import { layoutMindmap } from '../src/mindmap-view.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost' });
for (const key of ['window','document','Node','HTMLElement','Element','MutationObserver','getComputedStyle','DOMParser','navigator']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
const rich = md => new Editor({ element: document.createElement('div'), extensions: richExtensions(), content: md, contentType: 'markdown' });
const posOf = (editor, text) => { let pos; editor.state.doc.descendants((n, p) => { if (pos == null && n.isText && n.text.includes(text)) pos = p; }); return pos; };
const SAMPLE = '# 计划\n\n## 工作\n\n- 项目 A\n  - 设计\n  - 开发\n- 项目 B\n\n## 生活\n\n买菜\n\n### 周末\n\n- [ ] 爬山';

test('outline finds foldable headings and list branches only', () => {
  const e = rich(SAMPLE);
  const items = scanOutline(e.state.doc);
  assert.deepEqual(items.filter(i => i.kind === 'heading').map(i => e.state.doc.nodeAt(i.pos).textContent), ['计划', '工作', '生活', '周末']);
  assert.deepEqual(items.filter(i => i.kind === 'item').map(i => e.state.doc.nodeAt(i.pos).textContent), ['项目 A设计开发']);
  e.destroy();
});

test('folding hides content but never changes the Markdown', () => {
  const e = rich(SAMPLE), before = e.getMarkdown(), root = e.view.dom;
  assert.equal(before.trim(), SAMPLE);
  const work = scanOutline(e.state.doc).find(i => e.state.doc.nodeAt(i.pos).textContent === '工作');
  toggleFold(e, work.pos);
  assert.ok(root.querySelector('h2.folded'));
  assert.ok(root.querySelector('ul.fold-hidden'), 'section blocks are hidden');
  assert.equal(e.getMarkdown().trim(), before.trim());
  foldAll(e, true);
  assert.equal(getFolds(e.state).length, 5);
  assert.ok(root.querySelector('li.outline-parent.folded'));
  assert.equal(e.getMarkdown().trim(), before.trim());
  foldAll(e, false);
  assert.equal(getFolds(e.state).length, 0);
  assert.equal(root.querySelectorAll('.fold-hidden').length, 0);
  e.destroy();
});

test('fold toggles are clickable and folding moves the caret out of hidden text', () => {
  const e = rich('- 父\n  - 子');
  e.commands.setTextSelection(posOf(e, '子') + 1);
  const button = e.view.dom.querySelector('.fold-toggle');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(getFolds(e.state).length, 1);
  assert.equal(e.view.dom.querySelector('.fold-toggle').getAttribute('aria-expanded'), 'false');
  assert.ok(e.state.selection.head < posOf(e, '子'), 'caret moved to the parent');
  e.destroy();
});

test('moving the caret into a folded branch opens it; Ctrl+Up/Down fold at the caret', () => {
  const e = rich('- 父\n  - 子\n- 其他');
  e.commands.setTextSelection(posOf(e, '父') + 1);
  assert.ok(foldAtCursor(e, true)); assert.equal(getFolds(e.state).length, 1);
  e.commands.setTextSelection(posOf(e, '子') + 1);
  assert.equal(getFolds(e.state).length, 0, 'auto-unfolded');
  e.commands.setTextSelection(posOf(e, '父') + 1);
  foldAtCursor(e, true); assert.ok(foldAtCursor(e, false)); assert.equal(getFolds(e.state).length, 0);
  e.destroy();
});

test('folds follow edits above them and survive a reload by position', () => {
  const e = rich('段落\n\n- 父\n  - 子');
  const item = scanOutline(e.state.doc)[0].pos;
  toggleFold(e, item);
  e.commands.insertContentAt(1, '新');
  assert.deepEqual(getFolds(e.state), [item + 1]);
  const saved = getFolds(e.state);
  const again = rich(e.getMarkdown()); setFolds(again, saved);
  assert.deepEqual(getFolds(again.state), saved);
  setFolds(again, [9999]); assert.deepEqual(getFolds(again.state), [], 'stale positions are dropped');
  e.destroy(); again.destroy();
});

test('H button picks the heading level from context; Tab shifts heading levels', () => {
  const e = rich('第一行');
  e.commands.setTextSelection(1);
  assert.equal(autoHeadingLevel(e.state), 1);
  const f = rich('# 标题\n\n段落');
  f.commands.setTextSelection(posOf(f, '段落') + 1);
  assert.equal(autoHeadingLevel(f.state), 2);
  const g = rich('# 标题\n\n### 小节\n\n段落');
  g.commands.setTextSelection(posOf(g, '段落') + 1);
  assert.equal(autoHeadingLevel(g.state), 3);
  g.commands.setTextSelection(posOf(g, '小节') + 1);
  indentRich(g); assert.match(g.getMarkdown(), /^#### 小节/m);
  outdentRich(g); outdentRich(g); assert.match(g.getMarkdown(), /^## 小节/m);
  e.destroy(); f.destroy(); g.destroy();
});

test('mind map tree nests headings by level and lists by indentation', () => {
  const e = rich(SAMPLE);
  const t = mindmapTree(e.state.doc);
  assert.equal(t.label, '计划');
  assert.deepEqual(t.children.map(c => c.label), ['工作', '生活']);
  assert.deepEqual(t.children[0].children.map(c => c.label), ['项目 A', '项目 B']);
  assert.deepEqual(t.children[0].children[0].children.map(c => c.label), ['设计', '开发']);
  assert.deepEqual(t.children[1].children.map(c => c.label), ['买菜', '周末']);
  assert.equal(t.children[1].children[1].children[0].checked, false);
  const untitled = mindmapTree(rich('- a\n- b').state.doc, 'Untitled');
  assert.equal(untitled.label, 'Untitled'); assert.equal(untitled.children.length, 2);
  e.destroy();
});

test('mind map layout hides folded branches and keeps parents centred on children', () => {
  const e = rich(SAMPLE);
  const t = mindmapTree(e.state.doc);
  const open = layoutMindmap(t, new Set());
  const work = t.children[0];
  const closed = layoutMindmap(t, new Set([work.pos]));
  assert.equal(open.nodes.length - closed.nodes.length, 4);
  assert.ok(closed.nodes.find(n => n.n === work).collapsed);
  const a = open.nodes.find(n => n.n.label === '项目 A');
  assert.equal(a.y, (a.kids[0].y + a.kids[1].y) / 2);
  assert.ok(open.nodes.every(n => !n.parent || n.x > n.parent.x + n.parent.w));
  e.destroy();
});

async function openMap(content, extra = {}) {
  const w = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost' }).window;
  w.Range.prototype.getClientRects = () => [];
  w.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 });
  w.Element.prototype.scrollIntoView = () => {};
  const saved = [], metas = [];
  w.notes = { load: async () => ({ id: 'test', mode: 'rich', tone: 0, content, pinned: false, ...extra }), save: md => { saved.push(md); return { ok: true }; }, meta: async p => { metas.push(p); return p; } };
  w.eval(fs.readFileSync('dist/renderer.js', 'utf8'));
  await new Promise(r => setTimeout(r, 80));
  const d = w.document, map = d.getElementById('mindmap');
  const labels = () => [...d.querySelectorAll('.mm-node')].map(n => n.querySelector('.mm-label, input')?.value ?? n.querySelector('.mm-label').textContent);
  const nodeEl = label => [...d.querySelectorAll('.mm-node')].find(n => n.querySelector('.mm-label')?.textContent === label);
  const press = (el, target = el) => { target.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); target.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); };
  const key = (k, opts = {}, target = map) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }));
  const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
  return { w, d, map, saved, metas, labels, nodeEl, press, key, tick };
}

test('bundled renderer switches to mind map, folds from the map and opens a node in the outline', async () => {
  const { w, d, saved, metas, labels, nodeEl, press, tick } = await openMap(SAMPLE);
  d.getElementById('viewToggle').click(); await tick();
  assert.equal(d.getElementById('mindmap').hidden, false);
  assert.equal(d.getElementById('rich').hidden, true);
  assert.ok(d.querySelector('[data-format=bold]').disabled);
  assert.equal(labels()[0], '计划');
  assert.equal(labels().length, 10);
  press(nodeEl('工作'), nodeEl('工作').querySelector('.mm-fold')); await tick(40);
  assert.equal(labels().length, 6);
  assert.ok(d.querySelector('.mm-node.collapsed .mm-fold'));
  assert.ok(d.querySelector('h2.folded'), 'fold is shared with the outline');
  const table = await openMap('# 根\n\n```\nconst a = 1;\n```');
  table.d.getElementById('viewToggle').click(); await tick();
  table.nodeEl('const a = 1;').dispatchEvent(new table.w.MouseEvent('dblclick', { bubbles: true }));
  await tick();
  assert.equal(table.d.getElementById('mindmap').hidden, true, 'non-editable nodes open in the outline');
  table.w.close();
  assert.deepEqual(metas.map(m => m.view), ['mindmap']);
  await tick(450);
  w.dispatchEvent(new w.Event('blur'));
  assert.equal(saved.length, 0, 'viewing and folding never save the file');
  w.close();
});

test('mind map edits: Tab adds a child, Enter a sibling, double-click renames, Delete removes, all saved as Markdown', async () => {
  const { w, d, map, saved, labels, nodeEl, press, key, tick } = await openMap('# 计划\n\n- 工作\n- 生活');
  d.getElementById('viewToggle').click(); await tick();
  press(nodeEl('工作')); assert.ok(nodeEl('工作').classList.contains('selected'));
  key('Tab'); await tick();
  let input = d.querySelector('.mm-input'); assert.ok(input, 'new child opens for typing');
  input.value = '写周报'; key('Enter', {}, input); await tick();
  assert.ok(labels().includes('写周报'));
  key('Enter'); await tick();
  input = d.querySelector('.mm-input'); input.value = '开会'; key('Enter', {}, input); await tick();
  nodeEl('生活').dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true })); await tick();
  input = d.querySelector('.mm-input'); assert.equal(input.value, '生活');
  input.value = '休息'; key('Enter', {}, input); await tick();
  key('Tab'); await tick(); key('Escape', {}, d.querySelector('.mm-input')); await tick();
  press(nodeEl('开会')); key('Delete'); await tick();
  await tick(450);
  assert.equal(saved.at(-1).trim(), '# 计划\n\n- 工作\n  - 写周报\n- 休息');
  assert.equal(d.querySelector('.tiptap li li').textContent, '写周报', 'outline shows the map edit');
  key('z', { ctrlKey: true }); await tick();
  assert.ok(labels().includes('开会'), 'Ctrl+Z restores the deleted node');
  assert.equal(map.contains(d.activeElement) || d.activeElement === map, true);
  w.close();
});

test('mind map drag and drop moves a node under a new parent', async () => {
  const { w, d, saved, nodeEl, tick } = await openMap('# 计划\n\n- 工作\n  - 设计\n- 生活');
  d.getElementById('viewToggle').click(); await tick();
  const src = nodeEl('设计'), dst = nodeEl('生活');
  dst.getBoundingClientRect = () => ({ left: 100, right: 200, top: 100, bottom: 128, width: 100, height: 28 });
  d.elementFromPoint = () => dst;
  const ev = (type, x, y) => new w.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
  src.dispatchEvent(ev('pointerdown', 10, 10));
  src.dispatchEvent(ev('pointermove', 60, 60));
  src.dispatchEvent(ev('pointermove', 150, 114));
  assert.ok(dst.classList.contains('drop-child'));
  src.dispatchEvent(ev('pointerup', 150, 114)); await tick(450);
  assert.equal(saved.at(-1).trim(), '# 计划\n\n- 工作\n- 生活\n  - 设计');
  assert.equal(d.querySelectorAll('.mm-ghost').length, 0);
  w.close();
});

test('read-only notes show the map but block edits', async () => {
  const { w, d, saved, nodeEl, press, key, tick } = await openMap('# 根\n\n- 叶\n\n| a | b |\n|---|---|\n| 1 | 2 |');
  d.getElementById('viewToggle').click(); await tick();
  press(nodeEl('叶')); key('Delete'); key('Tab'); await tick(450);
  assert.ok(nodeEl('叶')); assert.equal(d.querySelector('.mm-input'), null); assert.equal(saved.length, 0);
  w.close();
});
test('a note saved in mind map view reopens in mind map view', async () => {
  const w = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost' }).window;
  w.Range.prototype.getClientRects = () => [];
  w.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 });
  w.notes = { load: async () => ({ id: 'test', mode: 'rich', tone: 0, view: 'mindmap', content: '# 根\n\n- 叶', pinned: false }), save: () => ({ ok: true }) };
  w.eval(fs.readFileSync('dist/renderer.js', 'utf8'));
  await new Promise(r => setTimeout(r, 80));
  assert.equal(w.document.getElementById('mindmap').hidden, false);
  assert.deepEqual([...w.document.querySelectorAll('.mm-node .mm-label')].map(n => n.textContent), ['根', '叶']);
  w.close();
});

test('title field creates, renames and clears the opening H1', async () => {
  const { w, d, saved, labels, tick } = await openMap('- 工作');
  const title = d.getElementById('docTitle');
  assert.equal(title.value, '');
  title.value = '本周计划'; title.dispatchEvent(new w.Event('input')); await tick(450);
  assert.equal(saved.at(-1).trim(), '# 本周计划\n\n- 工作');
  title.value = '下周计划'; title.dispatchEvent(new w.Event('input')); await tick(450);
  assert.equal(saved.at(-1).trim(), '# 下周计划\n\n- 工作');
  d.getElementById('viewToggle').click(); await tick();
  assert.equal(labels()[0], '下周计划', 'title is the mind-map root');
  title.value = ''; title.dispatchEvent(new w.Event('input')); await tick(450);
  assert.equal(saved.at(-1).trim(), '- 工作');
  assert.match(d.title, /^Untitled/);
  w.close();
});

test('mind map: toolbar buttons, click-twice and type-to-edit all edit nodes', async () => {
  const { w, d, map, saved, labels, nodeEl, press, key, tick } = await openMap('# 计划\n\n- 工作');
  d.getElementById('viewToggle').click(); await tick();
  assert.equal(d.querySelector('.mapTools').hidden, false);
  assert.equal(d.querySelector('.formatTools').hidden, true);
  press(nodeEl('工作'));
  d.querySelector('[data-map=child]').click(); await tick();
  let input = d.querySelector('.mm-input'); input.value = '周报'; key('Enter', {}, input); await tick();
  press(nodeEl('周报')); press(nodeEl('周报')); await tick();
  input = d.querySelector('.mm-input'); assert.ok(input, 'second click edits');
  input.value = '周报 v2'; key('Enter', {}, input); await tick();
  press(nodeEl('工作')); await tick(500);
  key('学'); await tick();
  input = d.querySelector('.mm-input'); assert.equal(input.value, '学', 'typing starts an edit');
  input.value = '学习'; key('Enter', {}, input); await tick(450);
  assert.equal(saved.at(-1).trim(), '# 计划\n\n- 学习\n  - 周报 v2');
  assert.deepEqual(labels(), ['计划', '学习', '周报 v2']);
  w.close();
});
