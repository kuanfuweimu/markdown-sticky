import { mindmapTree, isInside } from './mindmap.js';
import { LIST, outlineKey } from './outline.js';

// Mind-map edits are ordinary editor transactions, so they autosave, undo with Ctrl+Z and show up in the outline at once.
export function findNode(tree, pos) {
  if (pos == null) return tree;
  let hit = null;
  const walk = n => { if (hit) return; if (n.pos === pos) hit = n; else n.children.forEach(walk); };
  walk(tree);
  return hit;
}
function sectionEnd(doc, pos) {
  if (pos == null) return doc.content.size;
  const level = doc.nodeAt(pos).attrs.level;
  let end = doc.content.size;
  doc.forEach((n, p) => { if (end === doc.content.size && p > pos && n.type.name === 'heading' && n.attrs.level <= level) end = p; });
  return end;
}
const ownEnd = (doc, node) => node.pos == null ? 0 : node.pos + doc.nodeAt(node.pos).nodeSize;
const itemTypeFor = listType => listType === 'taskList' ? 'taskItem' : 'listItem';
function asItem(schema, node, typeName) {
  if (node.type.name === typeName) return node;
  return schema.nodes[typeName].createChecked(typeName === 'taskItem' ? { checked: false } : null, node.content);
}
const emptyItem = (schema, typeName = 'listItem') => schema.nodes[typeName].create(typeName === 'taskItem' ? { checked: false } : null, schema.nodes.paragraph.create());

// Where a new last child of `node` goes. Heading sections and the root take list items before their sub-headings;
// list items take them in their own nested list.
function childPlan(doc, node) {
  if (node.kind === 'item') {
    const item = doc.nodeAt(node.pos);
    let listPos = -1, list = null;
    item.forEach((c, o) => { if (LIST.has(c.type.name)) { listPos = node.pos + 1 + o; list = c; } });
    if (list) return { pos: listPos + list.nodeSize - 1, listType: list.type.name };
    return { pos: node.pos + item.nodeSize - 1, wrapType: doc.resolve(node.pos).parent.type.name };
  }
  const firstHeading = node.children.find(c => c.kind === 'heading');
  const at = firstHeading ? firstHeading.pos : sectionEnd(doc, node.pos);
  const before = doc.resolve(at).nodeBefore;
  if (before && LIST.has(before.type.name) && at - before.nodeSize >= ownEnd(doc, node)) return { pos: at - 1, listType: before.type.name };
  return { pos: at, wrapType: 'bulletList' };
}
function insertItem(tr, plan, item) {
  const schema = tr.doc.type.schema;
  if (plan.listType) { tr.insert(plan.pos, asItem(schema, item, itemTypeFor(plan.listType))); return plan.pos; }
  tr.insert(plan.pos, schema.nodes[plan.wrapType].create(null, asItem(schema, item, itemTypeFor(plan.wrapType))));
  return plan.pos + 1;
}
// Range removed when a node and its branch go away. A list item that is alone in its list takes the list with it.
function removalRange(doc, node) {
  if (node.kind === 'heading' || (node.kind === 'root' && !node.virtual)) return [node.pos, node.kind === 'root' ? doc.nodeAt(0).nodeSize : sectionEnd(doc, node.pos)];
  const size = doc.nodeAt(node.pos).nodeSize;
  if (node.kind === 'item') {
    const $p = doc.resolve(node.pos);
    if ($p.parent.childCount === 1) return [$p.before(), $p.before() + $p.parent.nodeSize];
  }
  return [node.pos, node.pos + size];
}
function run(editor, build) {
  const { state } = editor, tree = mindmapTree(state.doc), tr = state.tr;
  const result = build(state.doc, tree, tr, state.schema);
  if (result == null || !tr.docChanged) return null;
  editor.view.dispatch(tr);
  return result;
}
const unfold = (tr, pos) => { if (pos != null) tr.setMeta(outlineKey, { unfold: [tr.mapping.map(pos, 1)] }); };

export function addChild(editor, pos) {
  return run(editor, (doc, tree, tr, schema) => {
    let node = findNode(tree, pos);
    if (!node) return null;
    if (node.kind === 'block') return addSiblingIn(doc, node, tr, schema);
    const at = insertItem(tr, childPlan(doc, node), emptyItem(schema));
    unfold(tr, node.pos);
    return { pos: at };
  });
}
function addSiblingIn(doc, node, tr, schema) {
  const size = doc.nodeAt(node.pos).nodeSize;
  if (node.kind === 'item') {
    const list = doc.resolve(node.pos).parent;
    tr.insert(node.pos + size, emptyItem(schema, itemTypeFor(list.type.name)));
    return { pos: node.pos + size };
  }
  if (node.kind === 'heading') {
    const end = sectionEnd(doc, node.pos);
    tr.insert(end, schema.nodes.heading.create({ level: node.level }));
    return { pos: end };
  }
  tr.insert(node.pos + size, schema.nodes.paragraph.create());
  return { pos: node.pos + size };
}
export function addSibling(editor, pos) {
  return run(editor, (doc, tree, tr, schema) => {
    const node = findNode(tree, pos);
    if (!node) return null;
    if (node.kind === 'root') { const at = insertItem(tr, childPlan(doc, node), emptyItem(schema)); return { pos: at }; }
    return addSiblingIn(doc, node, tr, schema);
  });
}
// Removes a node with its branch and returns the node to select next: the previous sibling, else the next, else the parent.
export function removeNode(editor, pos) {
  return run(editor, (doc, tree, tr) => {
    const node = findNode(tree, pos);
    if (!node || node.kind === 'root') return null;
    const siblings = node.parent.children, i = siblings.indexOf(node);
    const next = siblings[i - 1] || siblings[i + 1] || node.parent;
    const [from, to] = removalRange(doc, node);
    tr.delete(from, to);
    const mapped = next.pos == null ? null : tr.mapping.mapResult(next.pos, next.pos >= to ? 1 : -1);
    return { pos: mapped && !mapped.deleted ? mapped.pos : null };
  });
}
export function renameNode(editor, pos, text) {
  text = String(text).replace(/\s*\n\s*/g, ' ');
  return run(editor, (doc, tree, tr, schema) => {
    const node = findNode(tree, pos);
    if (!node || !node.editable) return null;
    if (node.kind === 'root' && node.virtual) {
      if (!text.trim()) return null;
      tr.insert(0, schema.nodes.heading.create({ level: 1 }, schema.text(text)));
      return { pos: 0 };
    }
    const at = node.kind === 'item' ? node.pos + 1 : node.pos, block = doc.nodeAt(at);
    if (block.textContent === text && block.childCount <= 1) return null;
    const from = at + 1, to = at + 1 + block.content.size;
    if (text) tr.insertText(text, from, to); else tr.delete(from, to);
    return { pos: node.pos };
  });
}
export function toggleCheck(editor, pos) {
  return run(editor, (doc, tree, tr) => {
    const node = findNode(tree, pos);
    if (!node || node.checked == null) return null;
    tr.setNodeMarkup(node.pos, null, { ...doc.nodeAt(node.pos).attrs, checked: !node.checked });
    return { pos: node.pos };
  });
}
// Decides what a drop means. Headings move between sections; list items and paragraphs move anywhere items can live.
export function resolveDrop(node, target, zone) {
  if (!node || !target || node.kind === 'root' || (node.kind === 'block' && !node.editable)) return null;
  if (isInside(target, node)) return null;
  if (node.kind === 'heading') {
    if (target.kind === 'heading') return { target, mode: zone };
    if (target.kind === 'root') return { target, mode: 'child' };
    return null;
  }
  if (target.kind === 'item') return { target, mode: zone };
  if (target.kind === 'block') return target.parent === node ? null : { target: target.parent, mode: 'child' };
  return { target, mode: 'child' };
}
export function moveNode(editor, pos, targetPos, zone) {
  return run(editor, (doc, tree, tr, schema) => {
    const node = findNode(tree, pos), drop = resolveDrop(node, findNode(tree, targetPos), zone);
    if (!drop) return null;
    const { target, mode } = drop;
    if (node.kind === 'heading') {
      const end = sectionEnd(doc, node.pos), level = mode === 'child' ? target.level + 1 : target.level, delta = level - node.level;
      const moved = [];
      doc.slice(node.pos, end).content.forEach(n => moved.push(n.type.name === 'heading'
        ? n.type.create({ ...n.attrs, level: Math.max(1, Math.min(6, n.attrs.level + delta)) }, n.content, n.marks) : n));
      // The editor keeps an empty paragraph at the end of the document; it stays put instead of travelling with the section.
      while (moved.length > 1 && moved.at(-1).type.name === 'paragraph' && !moved.at(-1).content.size) moved.pop();
      const at = mode === 'before' ? target.pos : sectionEnd(doc, target.pos);
      tr.delete(node.pos, end);
      const ins = tr.mapping.map(at, -1);
      tr.insert(ins, moved);
      return { pos: ins };
    }
    const source = doc.nodeAt(node.pos);
    const item = node.kind === 'item' ? source : schema.nodes.listItem.create(null, source);
    const [from, to] = removalRange(doc, node);
    tr.delete(from, to);
    const after = mindmapTree(tr.doc);
    const mapped = target.pos == null ? null : tr.mapping.map(target.pos, 1);
    const dest = mapped == null ? after : findNode(after, mapped) || (target.pos === 0 ? after : null);
    if (!dest) return null;
    if (mode === 'child') { const at = insertItem(tr, childPlan(tr.doc, dest), item); unfold(tr, dest.pos); return { pos: at }; }
    const list = tr.doc.resolve(dest.pos).parent;
    const at = mode === 'after' ? dest.pos + tr.doc.nodeAt(dest.pos).nodeSize : dest.pos;
    tr.insert(at, asItem(schema, item, itemTypeFor(list.type.name)));
    return { pos: at };
  });
}
