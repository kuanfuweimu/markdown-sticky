import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Folding is view state only: it never changes the Markdown, so files stay byte-identical when branches are collapsed.
export const outlineKey = new PluginKey('outline');
const ITEM = new Set(['listItem', 'taskItem']);
export const LIST = new Set(['bulletList', 'orderedList', 'taskList']);

// Foldable blocks: list items that contain a nested list, and top-level headings followed by content in their section.
export function scanOutline(doc) {
  const items = [];
  const walk = (node, start, depth) => node.forEach((child, offset) => {
    const pos = start + offset;
    if (ITEM.has(child.type.name)) {
      let nested = -1;
      child.forEach((grand, o) => { if (nested < 0 && LIST.has(grand.type.name)) nested = pos + 1 + o; });
      if (nested >= 0) items.push({ pos, kind: 'item', depth, hideFrom: nested, end: pos + child.nodeSize });
      walk(child, pos + 1, depth + 1);
    } else if (!child.isTextblock && !child.isAtom) walk(child, pos + 1, depth);
  });
  walk(doc, 0, 0);
  const top = [];
  doc.forEach((node, pos) => top.push({ node, pos }));
  top.forEach((b, i) => {
    if (b.node.type.name !== 'heading') return;
    const level = b.node.attrs.level;
    let j = i + 1;
    while (j < top.length && !(top[j].node.type.name === 'heading' && top[j].node.attrs.level <= level)) j++;
    if (j > i + 1) items.push({ pos: b.pos, kind: 'heading', level, hideFrom: top[i + 1].pos, end: top[j - 1].pos + top[j - 1].node.nodeSize, blocks: top.slice(i + 1, j) });
  });
  return items.sort((a, b) => a.pos - b.pos);
}

const toggleWidget = (folded, owner) => view => {
  const b = view.dom.ownerDocument.createElement('button');
  b.type = 'button'; b.className = 'fold-toggle'; b.contentEditable = 'false'; b.tabIndex = -1;
  b.setAttribute('aria-label', folded ? 'Expand' : 'Collapse'); b.setAttribute('aria-expanded', String(!folded));
  b.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg>';
  b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); view.dispatch(view.state.tr.setMeta(outlineKey, { toggle: owner })); });
  return b;
};

// Legal-style numbers for nested ordered lists: 1. → 1.1 → 1.1.1. A numbered list inside a bullet or to-do list
// starts a fresh sequence, and each list honours its own start number. Display only: the Markdown stays standard.
export function outlineNumbers(doc) {
  const map = new Map();
  const walk = (node, start, prefix) => node.forEach((child, offset) => {
    const pos = start + offset;
    if (child.type.name === 'orderedList') {
      let n = Number(child.attrs.start) || 1;
      child.forEach((item, io) => {
        const ipos = pos + 1 + io, num = prefix ? `${prefix}.${n}` : String(n);
        map.set(ipos, num); n++;
        walk(item, ipos + 1, num);
      });
    } else if (LIST.has(child.type.name)) child.forEach((item, io) => walk(item, pos + 1 + io + 1, ''));
    else if (!child.isTextblock && !child.isAtom) walk(child, pos + 1, prefix);
  });
  walk(doc, 0, '');
  return map;
}
function build(doc, wanted) {
  const items = scanOutline(doc);
  const valid = new Set(items.map(i => i.pos));
  const folded = new Set([...wanted].filter(p => valid.has(p)));
  const decos = [], hidden = [];
  const numbers = outlineNumbers(doc);
  for (const [pos, num] of numbers) {
    const item = doc.nodeAt(pos);
    // Longer numbers get a wider gutter so 2.1.10 never overlaps the text.
    decos.push(Decoration.node(pos, pos + item.nodeSize, { 'data-num': num + (num.includes('.') ? '' : '.'), style: `--num-w:${Math.max(1.6, num.length * .58 + .7)}em` }));
  }
  for (const it of items) {
    const isFolded = folded.has(it.pos);
    if (it.kind === 'item') decos.push(Decoration.node(it.pos, it.end, { class: 'outline-parent' + (isFolded ? ' folded' : ''), 'data-depth': String(Math.min(it.depth, 3)) }));
    else if (isFolded) decos.push(Decoration.node(it.pos, it.pos + doc.nodeAt(it.pos).nodeSize, { class: 'folded' }));
    // Headings get the toggle inside their text; list items inside their first paragraph (pos + 2), next to the bullet.
    const node = doc.nodeAt(it.pos), at = it.kind === 'heading' ? it.pos + 1 : node.firstChild?.isTextblock ? it.pos + 2 : it.pos + 1;
    decos.push(Decoration.widget(at, toggleWidget(isFolded, it.pos), { side: -1, key: `fold-${it.pos}-${isFolded ? 'c' : 'o'}`, ignoreSelection: true, stopEvent: () => true }));
    if (!isFolded) continue;
    hidden.push({ owner: it.pos, from: it.hideFrom, to: it.end });
    if (it.kind === 'heading') for (const b of it.blocks) decos.push(Decoration.node(b.pos, b.pos + b.node.nodeSize, { class: 'fold-hidden' }));
  }
  return { folded, items, hidden, numbers, decorations: DecorationSet.create(doc, decos) };
}

function outlinePlugin() {
  return new Plugin({
    key: outlineKey,
    state: {
      init: (_, state) => build(state.doc, []),
      apply(tr, value, _old, state) {
        const meta = tr.getMeta(outlineKey);
        if (!tr.docChanged && !meta) return value;
        let folded = value.folded;
        if (tr.docChanged) folded = new Set([...folded].map(p => tr.mapping.mapResult(p, 1)).filter(r => !r.deleted).map(r => r.pos));
        if (meta?.set) folded = new Set(meta.set);
        if (meta?.toggle != null) { folded = new Set(folded); if (folded.has(meta.toggle)) folded.delete(meta.toggle); else folded.add(meta.toggle); }
        if (meta?.fold) folded = new Set([...folded, ...meta.fold]);
        if (meta?.unfold) { folded = new Set(folded); meta.unfold.forEach(p => folded.delete(p)); }
        return build(state.doc, folded);
      },
    },
    props: { decorations: state => outlineKey.getState(state).decorations },
    // The caret must never sit inside hidden text: folding moves it to the branch title, any other move into hidden text unfolds.
    appendTransaction(trs, _old, state) {
      const head = state.selection.head;
      const hit = outlineKey.getState(state).hidden.filter(h => head > h.from && head < h.to);
      if (!hit.length) return null;
      if (trs.some(t => t.getMeta(outlineKey))) {
        const owner = Math.min(...hit.map(h => h.owner)), node = state.doc.nodeAt(owner);
        const target = node.isTextblock ? owner + 1 + node.content.size : owner + 2 + (node.firstChild?.content.size || 0);
        return state.tr.setSelection(TextSelection.near(state.doc.resolve(Math.min(target, state.doc.content.size)), -1));
      }
      return state.tr.setMeta(outlineKey, { unfold: hit.map(h => h.owner) });
    },
  });
}

export const getFolds = state => [...outlineKey.getState(state).folded].sort((a, b) => a - b);
export function setFolds(editor, folds) {
  editor.view.dispatch(editor.state.tr.setMeta(outlineKey, { set: Array.isArray(folds) ? folds.filter(Number.isInteger) : [] }));
}
export function toggleFold(editor, pos) { editor.view.dispatch(editor.state.tr.setMeta(outlineKey, { toggle: pos })); }
// Ctrl+Up folds the innermost open branch around the caret; Ctrl+Down opens the innermost folded one.
export function foldAtCursor(editor, fold) {
  const { items, folded } = outlineKey.getState(editor.state), head = editor.state.selection.head;
  const hit = items.filter(it => head > it.pos && head < it.end && folded.has(it.pos) !== fold).at(-1);
  if (!hit) return false;
  editor.view.dispatch(editor.state.tr.setMeta(outlineKey, fold ? { fold: [hit.pos] } : { unfold: [hit.pos] }));
  return true;
}
export function foldAll(editor, fold) {
  const { items } = outlineKey.getState(editor.state);
  editor.view.dispatch(editor.state.tr.setMeta(outlineKey, { set: fold ? items.map(i => i.pos) : [] }));
  return true;
}
// The H button picks a level from context: the first heading is the title (H1), later ones match the nearest section above.
export function autoHeadingLevel(state) {
  const index = state.selection.$from.index(0);
  for (let i = index - 1; i >= 0; i--) {
    const n = state.doc.child(i);
    if (n.type.name === 'heading') return n.attrs.level === 1 ? 2 : n.attrs.level;
  }
  return 1;
}

export const Outline = Extension.create({
  name: 'outline',
  addProseMirrorPlugins() { return [outlinePlugin()]; },
  addKeyboardShortcuts() {
    return {
      'Mod-ArrowUp': () => foldAtCursor(this.editor, true),
      'Mod-ArrowDown': () => foldAtCursor(this.editor, false),
      'Mod-Shift-ArrowUp': () => foldAll(this.editor, true),
      'Mod-Shift-ArrowDown': () => foldAll(this.editor, false),
    };
  },
});
