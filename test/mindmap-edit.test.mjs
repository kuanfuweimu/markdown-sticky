import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { richExtensions } from '../src/editors.js';
import { mindmapTree } from '../src/mindmap.js';
import { addChild, addSibling, removeNode, renameNode, toggleCheck, moveNode, findNode } from '../src/mindmap-edit.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost' });
for (const key of ['window','document','Node','HTMLElement','Element','MutationObserver','getComputedStyle','DOMParser','navigator']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
const rich = md => new Editor({ element: document.createElement('div'), extensions: richExtensions(), content: md, contentType: 'markdown' });
const md = e => e.getMarkdown().trim();
const node = (e, label) => { let hit; const walk = n => { if (!hit && n.label === label) hit = n; n.children.forEach(walk); }; walk(mindmapTree(e.state.doc)); return hit; };
const PLAN = '# 计划\n\n## 工作\n\n- 项目 A\n  - 设计\n- 项目 B\n\n## 生活\n\n买菜';

test('rename a heading, an item and the virtual root', () => {
  const e = rich(PLAN);
  renameNode(e, node(e, '工作').pos, '上班');
  renameNode(e, node(e, '设计').pos, '原型');
  assert.equal(md(e), '# 计划\n\n## 上班\n\n- 项目 A\n  - 原型\n- 项目 B\n\n## 生活\n\n买菜');
  const f = rich('- a');
  renameNode(f, null, '标题');
  assert.equal(md(f), '# 标题\n\n- a');
  e.destroy(); f.destroy();
});

test('add children and siblings in the right Markdown place', () => {
  const e = rich(PLAN);
  const c = addChild(e, node(e, '项目 B').pos); renameNode(e, c.pos, '新子');
  const s = addSibling(e, node(e, '项目 A').pos); renameNode(e, s.pos, '项目 A2');
  const h = addChild(e, node(e, '生活').pos); renameNode(e, h.pos, '散步');
  const r = addChild(e, 0); renameNode(e, r.pos, '总目标');
  assert.equal(md(e), '# 计划\n\n- 总目标\n\n## 工作\n\n- 项目 A\n  - 设计\n- 项目 A2\n- 项目 B\n  - 新子\n\n## 生活\n\n买菜\n\n- 散步');
  const hs = addSibling(e, node(e, '工作').pos); renameNode(e, hs.pos, '学习');
  assert.match(md(e), /- 新子\n\n## 学习\n\n## 生活/);
  e.destroy();
});

test('delete removes a whole branch and picks a neighbour', () => {
  const e = rich(PLAN);
  const next = removeNode(e, node(e, '项目 A').pos);
  assert.equal(md(e), '# 计划\n\n## 工作\n\n- 项目 B\n\n## 生活\n\n买菜');
  assert.equal(findNode(mindmapTree(e.state.doc), next.pos).label, '项目 B');
  removeNode(e, node(e, '项目 B').pos);
  assert.equal(md(e), '# 计划\n\n## 工作\n\n## 生活\n\n买菜', 'empty list is removed');
  removeNode(e, node(e, '工作').pos);
  assert.equal(md(e), '# 计划\n\n## 生活\n\n买菜');
  assert.equal(removeNode(e, 0), null, 'root cannot be deleted');
  e.destroy();
});

test('drag moves items between parents, reorders, and moves heading sections', () => {
  const e = rich(PLAN);
  moveNode(e, node(e, '设计').pos, node(e, '项目 B').pos, 'child');
  assert.equal(md(e), '# 计划\n\n## 工作\n\n- 项目 A\n- 项目 B\n  - 设计\n\n## 生活\n\n买菜');
  moveNode(e, node(e, '项目 B').pos, node(e, '项目 A').pos, 'before');
  assert.equal(md(e), '# 计划\n\n## 工作\n\n- 项目 B\n  - 设计\n- 项目 A\n\n## 生活\n\n买菜');
  moveNode(e, node(e, '项目 A').pos, node(e, '生活').pos, 'child');
  assert.match(md(e), /## 生活\n\n买菜\n\n- 项目 A$/);
  moveNode(e, node(e, '生活').pos, node(e, '工作').pos, 'before');
  assert.match(md(e), /^# 计划\n\n## 生活\n\n买菜\n\n- 项目 A\n\n## 工作/);
  moveNode(e, node(e, '工作').pos, node(e, '生活').pos, 'child');
  assert.match(md(e), /### 工作/, 'heading level follows its new parent');
  assert.equal(moveNode(e, node(e, '生活').pos, node(e, '工作').pos, 'child'), null, 'cannot drop into own branch');
  e.destroy();
});

test('task check toggles and edits are undoable', () => {
  const e = rich('# T\n\n- [ ] 爬山');
  toggleCheck(e, node(e, '爬山').pos);
  assert.match(md(e), /- \[x\] 爬山/);
  removeNode(e, node(e, '爬山').pos);
  assert.equal(md(e), '# T');
  e.commands.undo();
  assert.match(md(e), /爬山/, 'deleted branch comes back with Ctrl+Z');
  e.destroy();
});
