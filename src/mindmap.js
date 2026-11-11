import { LIST } from './outline.js';

const clip = (s, n = 120) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
// Node kinds: root (opening H1, or a virtual title when there is none), heading, item (list or task item), block (any other block).
// `pos` is the block's document position, so map edits and folds act on the same block as the outline.
function leaf(block, pos) {
  const name = block.type.name;
  if (name === 'horizontalRule') return null;
  const text = block.textContent;
  const label = name === 'table' ? 'Table' : name === 'codeBlock' ? clip(text.split('\n')[0] + (text.includes('\n') ? ' …' : '')) : clip(text);
  return label ? { kind: 'block', label, text, pos, editable: name === 'paragraph', children: [] } : null;
}
function itemTree(item, pos) {
  const first = item.firstChild;
  const node = { kind: 'item', label: '', text: first?.isTextblock ? first.textContent : '', pos, editable: first?.type.name === 'paragraph', children: [] };
  if (item.type.name === 'taskItem') node.checked = !!item.attrs.checked;
  let labeled = false;
  item.forEach((child, o) => {
    const p = pos + 1 + o;
    if (LIST.has(child.type.name)) child.forEach((g, go) => node.children.push(itemTree(g, p + 1 + go)));
    else if (!labeled) { node.label = clip(child.textContent); labeled = true; }
    else { const l = leaf(child, p); if (l) node.children.push(l); }
  });
  if (!node.label) node.label = '…';
  return node;
}
// Builds the mind-map tree: an opening H1 is the root, headings nest by level, list items nest by indentation.
export function mindmapTree(doc, fallback = 'Untitled') {
  const first = doc.firstChild, titled = first?.type.name === 'heading' && first.attrs.level === 1 && !!first.textContent.trim();
  const root = { kind: 'root', virtual: !titled, level: titled ? 1 : 0, label: titled ? clip(first.textContent) : fallback, text: titled ? first.textContent : '', pos: titled ? 0 : null, editable: true, children: [] };
  const stack = [{ level: 0, node: root }];
  doc.forEach((block, pos, index) => {
    if (index === 0 && titled) return;
    const name = block.type.name, parent = stack[stack.length - 1].node;
    if (name === 'heading') {
      const level = block.attrs.level;
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      const n = { kind: 'heading', level, label: clip(block.textContent) || '…', text: block.textContent, pos, editable: true, children: [] };
      stack[stack.length - 1].node.children.push(n); stack.push({ level, node: n });
    } else if (LIST.has(name)) block.forEach((item, o) => parent.children.push(itemTree(item, pos + 1 + o)));
    else { const n = leaf(block, pos); if (n) parent.children.push(n); }
  });
  const link = (n, parent) => { n.parent = parent; n.key = n.pos == null ? 'root' : String(n.pos); n.children.forEach(c => link(c, n)); };
  link(root, null);
  return root;
}
export const isInside = (node, ancestor) => { for (let n = node; n; n = n.parent) if (n === ancestor) return true; return false; };
