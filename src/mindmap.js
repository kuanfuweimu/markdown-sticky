import { LIST } from './outline.js';

const clip = (s, n = 120) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function leaf(block, pos) {
  const name = block.type.name;
  if (name === 'horizontalRule') return null;
  const label = name === 'table' ? 'Table' : name === 'codeBlock' ? clip(block.textContent.split('\n')[0] + (block.textContent.includes('\n') ? ' …' : '')) : clip(block.textContent);
  return label ? { label, pos, children: [] } : null;
}
function itemTree(item, pos) {
  const node = { label: '', pos, children: [] };
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
// Builds the mind-map tree from the document: an opening H1 is the root, headings nest by level, list items nest by indentation.
// Each node keeps its document position so the map can fold and jump to the same block as the outline.
export function mindmapTree(doc, fallback = 'Untitled') {
  const first = doc.firstChild, titled = first?.type.name === 'heading' && first.attrs.level === 1 && !!first.textContent.trim();
  const root = { label: titled ? clip(first.textContent) : fallback, pos: titled ? 0 : null, children: [] };
  const stack = [{ level: 0, node: root }];
  doc.forEach((block, pos, index) => {
    if (index === 0 && titled) return;
    const name = block.type.name, parent = stack[stack.length - 1].node;
    if (name === 'heading') {
      const level = block.attrs.level;
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      const n = { label: clip(block.textContent) || '…', pos, children: [] };
      stack[stack.length - 1].node.children.push(n); stack.push({ level, node: n });
    } else if (LIST.has(name)) block.forEach((item, o) => parent.children.push(itemTree(item, pos + 1 + o)));
    else { const n = leaf(block, pos); if (n) parent.children.push(n); }
  });
  return root;
}
