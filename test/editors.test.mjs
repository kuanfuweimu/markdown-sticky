import test from 'node:test';
import assert from 'node:assert/strict';
import { richExtensions, indentRich, outdentRich, requiresSource } from '../src/editors.js';
import { Editor } from '@tiptap/core';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost' });
for (const key of ['window','document','Node','HTMLElement','Element','MutationObserver','getComputedStyle','DOMParser','navigator']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
function rich(md) { return new Editor({ element: document.createElement('div'), extensions: richExtensions(), content: md, contentType: 'markdown' }); }
function selectText(editor, text) { let pos; editor.state.doc.descendants((node, p) => { if (node.isText && node.text.includes(text)) pos = p + node.text.length; }); editor.commands.setTextSelection(pos); }
test('rich: Markdown headings, emphasis, ordered lists and task state round trip', () => {
  const editor = rich('# 标题\n\n**重点**\n\n1. 第一\n2. 第二\n\n- [ ] 任务\n- [x] 完成');
  const result = editor.getMarkdown(); assert.match(result, /# 标题/); assert.match(result,/\*\*重点\*\*/); assert.match(result,/2\. 第二/); assert.match(result,/- \[x\] 完成/); editor.destroy();
});
test('rich: ordered-list indentation and outdent preserve content', () => {
  const editor = rich('1. 第一\n2. 第二'); selectText(editor,'第二');
  indentRich(editor); assert.equal(editor.getJSON().content[0].content.length, 1); assert.match(editor.getMarkdown(), /第一[\s\S]*第二/);
  outdentRich(editor); assert.equal(editor.getJSON().content[0].content.length, 2); editor.destroy();
});
test('rich: task nesting and checkbox state survive serialization', () => {
  const editor = rich('- [ ] 任务一\n- [x] 任务二'); selectText(editor,'任务二'); indentRich(editor);
  assert.equal(editor.getJSON().content[0].content.length,1); assert.match(editor.getMarkdown(),/\[x\] 任务二/);
  outdentRich(editor); assert.equal(editor.getJSON().content[0].content.length,2); editor.destroy();
});
test('rich: Enter continues numbered list and empty item exits', () => {
  const editor = rich('1. 第一'); selectText(editor,'第一'); assert.ok(editor.commands.splitListItem('listItem'));
  assert.match(editor.getMarkdown(),/2\. /); assert.ok(editor.commands.liftEmptyBlock());
  assert.equal(editor.getJSON().content.at(-1).type,'paragraph'); editor.destroy();
});
test('complex Markdown is detected for read-only display', () => {
  assert.ok(requiresSource('| a | b |\n|---|---|'));
  assert.ok(requiresSource('![图](image.png)')); assert.ok(requiresSource('<div>x</div>'));
  assert.equal(requiresSource('# 标题\n\n- [ ] 待办'),false);
});
