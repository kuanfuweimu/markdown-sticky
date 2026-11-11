import { mindmapTree } from './mindmap.js';

// Lays the outline out left to right: each column is as wide as its widest label, each leaf takes one row.
const ROW = 34, GAP_X = 44, PAD = 24, MAX_W = 220, MIN_W = 36;
export function labelWidth(text, size = 13) {
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? size : size * .56;
  return Math.max(MIN_W, Math.min(MAX_W, Math.ceil(w) + 22));
}
export function layoutMindmap(root, folded) {
  const nodes = [], cols = [];
  const visit = (n, depth, parent) => {
    const open = !(n.pos != null && folded.has(n.pos));
    const item = { n, depth, parent, w: labelWidth(n.label, depth ? 13 : 15), kids: [], collapsed: !open && n.children.length > 0 };
    nodes.push(item); cols[depth] = Math.max(cols[depth] || 0, item.w);
    if (open) for (const c of n.children) item.kids.push(visit(c, depth + 1, item));
    return item;
  };
  const top = visit(root, 0, null);
  let row = 0;
  const place = it => {
    if (!it.kids.length) { it.y = row++ * ROW; return; }
    it.kids.forEach(place);
    it.y = (it.kids[0].y + it.kids.at(-1).y) / 2;
  };
  place(top);
  const x = [PAD];
  for (let d = 1; d < cols.length; d++) x[d] = x[d - 1] + cols[d - 1] + GAP_X;
  for (const it of nodes) { it.x = x[it.depth]; it.y += PAD; }
  return { nodes, width: x.at(-1) + cols.at(-1) + PAD, height: row * ROW + PAD * 2 - (ROW - 26) };
}

const SVG = 'http://www.w3.org/2000/svg';
// `foldable` holds the positions the editor outline can fold, so folding a branch here folds the same branch in the outline.
export function renderMindmap(host, doc, { title, folded, foldable, onToggle, onOpen, zoom = 1 }) {
  const tree = mindmapTree(doc, title);
  const { nodes, width, height } = layoutMindmap(tree, folded);
  const d = host.ownerDocument;
  const canvas = d.createElement('div'); canvas.className = 'mm-canvas';
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; canvas.style.zoom = String(zoom);
  const svg = d.createElementNS(SVG, 'svg'); svg.setAttribute('width', width); svg.setAttribute('height', height); svg.setAttribute('class', 'mm-links');
  for (const it of nodes) {
    if (!it.parent) continue;
    const x1 = it.parent.x + it.parent.w, y1 = it.parent.y + 13, x2 = it.x, y2 = it.y + 13, mx = (x1 + x2) / 2;
    const path = d.createElementNS(SVG, 'path');
    path.setAttribute('d', `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
    svg.append(path);
  }
  canvas.append(svg);
  nodes.forEach((it, i) => {
    const el = d.createElement('button');
    const canFold = it.n.children.length > 0 && foldable.has(it.n.pos);
    el.type = 'button';
    el.className = 'mm-node' + (it.depth ? '' : ' root') + (it.n.children.length ? ' branch' : '') + (it.collapsed ? ' collapsed' : '') + (it.n.checked ? ' done' : '');
    el.style.cssText = `left:${it.x}px;top:${it.y}px;width:${it.w}px;--i:${Math.min(i, 30)}`;
    el.title = it.n.label + (canFold ? (it.collapsed ? ' · Click to expand' : ' · Click to collapse') : '') + ' · Double-click to edit';
    el.textContent = (it.n.checked != null ? (it.n.checked ? '☑ ' : '☐ ') : '') + it.n.label;
    if (it.collapsed) { const c = d.createElement('span'); c.className = 'mm-count'; c.textContent = String(it.n.children.length); el.append(c); }
    el.onclick = () => { if (canFold) onToggle(it.n.pos); };
    el.ondblclick = () => onOpen(it.n.pos);
    canvas.append(el);
  });
  host.replaceChildren(canvas);
  return { count: nodes.length };
}
