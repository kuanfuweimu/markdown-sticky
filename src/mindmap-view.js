import { mindmapTree, isInside } from './mindmap.js';
import { outlineKey } from './outline.js';
import * as ops from './mindmap-edit.js';

// Lays the outline out left to right. Nodes show their whole label: text is measured with the real font, and
// labels wider than MAX_W wrap onto more lines, so each node's height follows its text.
const ROW_GAP = 8, GAP_X = 52, PAD = 28, MAX_W = 300, MIN_W = 40, LINE = 19, PAD_Y = 4.5;
const FONT = '"Segoe UI Variable Text","Segoe UI","Microsoft YaHei UI",sans-serif';
let ctx;
function measure(text, size, weight) {
  if (ctx === undefined) { try { ctx = (globalThis.OffscreenCanvas ? new OffscreenCanvas(1, 1) : globalThis.document?.createElement('canvas'))?.getContext?.('2d') || null; } catch { ctx = null; } }
  if (ctx) { ctx.font = `${weight} ${size}px ${FONT}`; const w = ctx.measureText(text).width; if (w > 0 || !text) return w; }
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? size : size * .56;
  return w;
}
export function labelWidth(text, size = 13, weight = 400) { return Math.max(MIN_W, Math.min(MAX_W, Math.ceil(measure(text, size, weight)) + 24)); }
// Node box: width capped at MAX_W, height grows by wrapped lines.
export function nodeBox(n, depth) {
  const size = depth ? 13 : 15, weight = depth ? (n.kind === 'heading' ? 600 : 400) : 650;
  const extra = (n.checked != null ? 20 : 0) + (n.num ? measure(n.num, 13, 500) + 6 : 0) + (n.progress ? measure(`${n.progress.done}/${n.progress.total}`, 10.5, 600) + 18 : 0) + (n.children.length ? 24 : 0) + 22;
  const text = Math.ceil(measure(n.label, size, weight)) + 2;
  const w = Math.max(MIN_W, Math.min(MAX_W, text + extra));
  const lines = Math.max(1, Math.ceil(text / Math.max(40, w - extra)));
  const line = depth ? LINE : 22;
  return { w, h: Math.round(lines * line + PAD_Y * 2 + (depth ? 0 : 2)), lines };
}
export function layoutMindmap(root, folded) {
  const nodes = [], cols = [];
  const visit = (n, depth, parent) => {
    const open = !(n.pos != null && folded.has(n.pos));
    const item = { n, depth, parent, ...nodeBox(n, depth), kids: [], collapsed: !open && n.children.length > 0 };
    nodes.push(item); cols[depth] = Math.max(cols[depth] || 0, item.w);
    if (open) for (const c of n.children) item.kids.push(visit(c, depth + 1, item));
    return item;
  };
  const top = visit(root, 0, null);
  // Leaves stack top to bottom by their own heights; a parent is centred on its children.
  let y = 0;
  const place = it => {
    if (!it.kids.length) { it.y = y; y += it.h + ROW_GAP; return; }
    it.kids.forEach(place);
    const first = it.kids[0], last = it.kids.at(-1);
    it.y = (first.y + first.h / 2 + last.y + last.h / 2) / 2 - it.h / 2;
    if (it.y + it.h + ROW_GAP > y) y = it.y + it.h + ROW_GAP;
  };
  place(top);
  const minY = Math.min(...nodes.map(it => it.y));
  const x = [PAD];
  for (let d = 1; d < cols.length; d++) x[d] = x[d - 1] + cols[d - 1] + GAP_X;
  for (const it of nodes) { it.x = x[it.depth]; it.y += PAD - Math.min(0, minY); it.cy = it.y + it.h / 2; }
  const bottom = Math.max(...nodes.map(it => it.y + it.h));
  return { nodes, width: x.at(-1) + cols.at(-1) + PAD * 2, height: bottom + PAD };
}

const SVG = 'http://www.w3.org/2000/svg';
const keyOf = pos => pos == null ? 'root' : String(pos);
const draggable = n => n.kind === 'heading' || n.kind === 'item' || (n.kind === 'block' && n.editable);

// Interactive mind map. Every edit is an editor transaction on the shared document, so it autosaves,
// undoes with Ctrl+Z and appears in the outline immediately. Selection is tracked by document position.
export class MindmapView {
  constructor(host, { editor, readOnly, onOpen, title = 'Untitled' }) {
    Object.assign(this, { host, getEditor: editor, readOnly, onOpen, title });
    this.selected = null; this.zoom = 1; this.editing = null; this.press = null; this.nodes = [];
    host.setAttribute('role', 'tree');
    // Move/up listen on the document instead of capturing the pointer: Chromium retargets click and dblclick
    // to a capturing element, which made double-click-to-edit land on the canvas instead of the node.
    const doc = host.ownerDocument;
    host.addEventListener('pointerdown', e => this.down(e));
    doc.addEventListener('pointermove', e => this.move(e));
    doc.addEventListener('pointerup', e => this.up(e));
    doc.addEventListener('pointercancel', () => this.cancelPress());
    host.addEventListener('dblclick', e => {
      const el = e.target.closest?.('.mm-node');
      if (el && !e.target.closest('.mm-fold,.mm-check,input')) this.startEdit(this.posOf(el));
    });
    this.lastClick = { pos: undefined, at: 0 };
    host.addEventListener('keydown', e => this.key(e));
    // Ctrl+wheel and trackpad pinch (which Chromium reports as Ctrl+wheel) zoom toward the cursor.
    // Small trackpad deltas give small steps, so pinching feels continuous rather than notched.
    host.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      this.zoomTo(this.targetZoom * Math.exp(-Math.max(-60, Math.min(60, delta)) * .0035), e.clientX, e.clientY);
    }, { passive: false });
    this.targetZoom = 1; this.zoomFrame = 0;
  }
  get editor() { return this.getEditor(); }
  posOf(el) { return el.dataset.key === 'root' ? null : Number(el.dataset.key); }
  elFor(pos) { return this.host.querySelector(`.mm-node[data-key="${keyOf(pos)}"]`); }
  current() { return this.nodes.find(it => it.n.pos === this.selected) || this.nodes[0]; }
  // Zoom never rebuilds the map: it scales the canvas on the GPU and resizes a spacer so scrollbars stay right,
  // easing toward the target each frame while keeping the point under the cursor fixed.
  setZoom(z) { this.zoomTo(z); }
  zoomBy(factor) { this.zoomTo(this.targetZoom * factor); }
  zoomTo(z, clientX, clientY) {
    this.targetZoom = Math.max(.3, Math.min(3, z));
    const box = this.host.getBoundingClientRect();
    this.anchor = clientX == null ? { x: this.host.clientWidth / 2, y: this.host.clientHeight / 2 } : { x: clientX - box.left, y: clientY - box.top };
    const reduce = !!this.host.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { this.applyZoom(this.targetZoom); return; }
    if (!this.zoomFrame) { this.host.classList.add('zooming'); this.zoomFrame = requestAnimationFrame(() => this.zoomStep()); }
  }
  zoomStep() {
    const diff = this.targetZoom - this.zoom;
    const next = Math.abs(diff) < .002 ? this.targetZoom : this.zoom + diff * .32;
    this.applyZoom(next);
    if (next !== this.targetZoom) this.zoomFrame = requestAnimationFrame(() => this.zoomStep());
    else {
      this.zoomFrame = 0;
      // Dropping will-change lets Chromium re-rasterize text crisply at the final scale.
      clearTimeout(this.sharpTimer); this.sharpTimer = setTimeout(() => { if (!this.zoomFrame) this.host.classList.remove('zooming'); }, 120);
    }
  }
  applyZoom(z) {
    const old = this.zoom, h = this.host, a = this.anchor || { x: 0, y: 0 };
    const cx = (h.scrollLeft + a.x) / old, cy = (h.scrollTop + a.y) / old;
    this.zoom = z;
    if (this.canvas) {
      this.canvas.style.transform = `scale(${z})`;
      this.sizer.style.width = this.size.width * z + 'px'; this.sizer.style.height = this.size.height * z + 'px';
    }
    h.scrollLeft = cx * z - a.x; h.scrollTop = cy * z - a.y;
  }

  render() {
    if (this.editing) { this.stale = true; return; }
    const editor = this.editor; if (!editor) return;
    const st = outlineKey.getState(editor.state);
    this.tree = mindmapTree(editor.state.doc, this.title);
    // Same 1.1 / 2.1.1 numbers as the outline.
    const walk = n => { const num = st.numbers?.get(n.pos); if (num) n.num = num; const pr = st.progress?.get(n.pos); if (pr) n.progress = pr; n.children.forEach(walk); };
    walk(this.tree);
    this.foldable = new Set(st.items.map(i => i.pos));
    const { nodes, width, height } = layoutMindmap(this.tree, st.folded);
    this.nodes = nodes;
    if (!nodes.some(it => it.n.pos === this.selected)) this.selected = null;
    const d = this.host.ownerDocument, ro = this.readOnly();
    const canvas = d.createElement('div'); canvas.className = 'mm-canvas' + (this.canvas ? ' settled' : '');
    canvas.style.cssText = `width:${width}px;height:${height}px;transform:scale(${this.zoom})`;
    const sizer = d.createElement('div'); sizer.className = 'mm-sizer';
    sizer.style.cssText = `width:${width * this.zoom}px;height:${height * this.zoom}px`;
    sizer.append(canvas);
    Object.assign(this, { canvas, sizer, size: { width, height } });
    const svg = d.createElementNS(SVG, 'svg'); svg.setAttribute('width', width); svg.setAttribute('height', height); svg.setAttribute('class', 'mm-links');
    for (const it of nodes) {
      if (!it.parent) continue;
      const x1 = it.parent.x + it.parent.w, y1 = it.parent.cy, x2 = it.x, y2 = it.cy, mx = (x1 + x2) / 2;
      const path = d.createElementNS(SVG, 'path');
      path.setAttribute('d', `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
      svg.append(path);
    }
    canvas.append(svg);
    nodes.forEach((it, i) => {
      const n = it.n, el = d.createElement('div');
      const canFold = n.children.length > 0 && this.foldable.has(n.pos);
      el.className = 'mm-node' + (it.depth ? '' : ' root') + (n.kind === 'heading' ? ' heading' : '') + (n.children.length ? ' branch' : '')
        + (it.collapsed ? ' collapsed' : '') + (n.checked ? ' done' : '') + (n.virtual ? ' virtual' : '') + (n.pos === this.selected ? ' selected' : '');
      el.dataset.key = keyOf(n.pos);
      el.setAttribute('role', 'treeitem'); el.setAttribute('aria-selected', String(n.pos === this.selected));
      if (canFold) el.setAttribute('aria-expanded', String(!it.collapsed));
      el.style.cssText = `left:${it.x}px;top:${it.y}px;width:${it.w}px;min-height:${it.h}px;--i:${Math.min(i, 30)}`;
      if (it.lines > 1) el.classList.add('wrap');
      el.title = (n.text || n.label) + (ro ? '' : '\nDouble-click or F2 to edit · Drag to move');
      if (n.checked != null) {
        const c = d.createElement('span'); c.className = 'mm-check'; c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', String(n.checked)); c.title = n.checked ? 'Mark not done' : 'Mark done';
        el.append(c);
      }
      if (n.num) { const num = d.createElement('span'); num.className = 'mm-num'; num.textContent = n.num; el.append(num); }
      const progressEl = n.progress && Object.assign(d.createElement('span'), { className: 'mm-progress' + (n.progress.done === n.progress.total ? ' complete' : ''), textContent: `${n.progress.done}/${n.progress.total}`, title: `${n.progress.done} of ${n.progress.total} to-dos done` });
      const label = d.createElement('span'); label.className = 'mm-label'; label.textContent = n.label; el.append(label);
      if (progressEl) el.append(progressEl);
      if (canFold) {
        const f = d.createElement('span'); f.className = 'mm-fold'; f.title = it.collapsed ? 'Expand' : 'Collapse';
        f.textContent = it.collapsed ? String(n.children.length) : '−';
        el.append(f);
      }
      canvas.append(el);
    });
    const scroll = { left: this.host.scrollLeft, top: this.host.scrollTop };
    this.host.replaceChildren(sizer);
    this.host.scrollLeft = scroll.left; this.host.scrollTop = scroll.top;
    this.host.classList.toggle('readonly', ro);
    this.reveal();
  }
  reveal() { this.elFor(this.selected)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
  select(pos) {
    this.selected = pos;
    this.host.querySelectorAll('.mm-node.selected').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-selected', 'false'); });
    const el = this.elFor(pos); if (el) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
    this.reveal();
  }
  apply(result, edit = false) {
    if (!result) return false;
    this.selected = result.pos; this.render();
    if (edit) this.startEdit(result.pos, true);
    return true;
  }
  add(kind) {
    if (this.readOnly() || this.editing) return;
    this.apply(kind === 'child' ? ops.addChild(this.editor, this.selected) : ops.addSibling(this.editor, this.selected), true);
  }
  remove() {
    if (this.readOnly() || this.selected == null) return;
    const r = ops.removeNode(this.editor, this.selected);
    if (r) { this.selected = r.pos; this.render(); }
  }
  fold(pos) {
    if (!this.foldable.has(pos)) return;
    this.editor.view.dispatch(this.editor.state.tr.setMeta(outlineKey, { toggle: pos }));
    this.render();
  }

  startEdit(pos, isNew = false) {
    if (this.readOnly() || this.editing) return;
    const node = ops.findNode(this.tree, pos), el = this.elFor(pos);
    if (!node || !el) return;
    if (!node.editable) { this.onOpen(node.pos); return; }
    this.select(pos);
    const input = this.host.ownerDocument.createElement('input');
    input.className = 'mm-input'; input.value = node.virtual ? '' : node.text; input.placeholder = node.virtual ? 'Title' : '';
    input.setAttribute('aria-label', 'Edit node');
    const base = parseFloat(el.style.width);
    const grow = () => { el.style.width = Math.max(base, Math.min(520, labelWidth(input.value || ' ', node.kind === 'root' ? 15 : 13) + 60)) + 'px'; };
    el.querySelector('.mm-label').replaceWith(input); el.classList.add('editing');
    this.editing = { pos, isNew, input };
    grow(); input.addEventListener('input', grow);
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); this.finishEdit(true); }
      else if (e.key === 'Tab') { e.preventDefault(); this.finishEdit(true, e.shiftKey ? null : 'child'); }
      else if (e.key === 'Escape') { e.preventDefault(); this.finishEdit(false); }
    });
    input.addEventListener('blur', () => this.finishEdit(true, null, false));
    input.addEventListener('pointerdown', e => e.stopPropagation());
    input.focus(); input.select();
  }
  finishEdit(commit, then = null, refocus = true) {
    const ed = this.editing; if (!ed) return;
    this.editing = null;
    const value = ed.input.value;
    if (ed.isNew && (!commit || !value.trim())) { const r = ops.removeNode(this.editor, ed.pos); this.selected = r ? r.pos : null; }
    else if (commit) { const r = ops.renameNode(this.editor, ed.pos, value); if (r) this.selected = r.pos; }
    this.stale = false; this.render();
    if (refocus) this.host.focus({ preventScroll: true });
    if (then === 'child') this.add('child');
  }

  key(e) {
    if (this.editing || e.target.closest?.('input')) return;
    const editor = this.editor; if (!editor) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key;
    if (mod && (k.toLowerCase() === 'z' || k.toLowerCase() === 'y')) {
      e.preventDefault();
      if (k.toLowerCase() === 'y' || e.shiftKey) editor.commands.redo(); else editor.commands.undo();
      this.render(); return;
    }
    if (mod || e.altKey) return;
    const handled = {
      Tab: () => this.add('child'),
      Enter: () => this.add('sibling'),
      F2: () => this.startEdit(this.selected),
      Delete: () => this.remove(),
      Backspace: () => this.remove(),
      ' ': () => this.fold(this.selected),
      ArrowLeft: () => this.nav('left'), ArrowRight: () => this.nav('right'), ArrowUp: () => this.nav('up'), ArrowDown: () => this.nav('down'),
      Home: () => this.select(null),
    }[k];
    if (handled) { e.preventDefault(); e.stopPropagation(); handled(); return; }
    // Typing a character on a selected node starts editing with it, like most mind-map apps.
    if (k.length === 1 && !this.readOnly()) {
      const node = ops.findNode(this.tree, this.selected);
      if (node?.editable) { e.preventDefault(); this.startEdit(this.selected); if (this.editing) { this.editing.input.value = k; this.editing.input.dispatchEvent(new Event('input')); } }
    }
  }
  nav(dir) {
    const cur = this.current(); if (!cur) return;
    if (dir === 'left') { if (cur.parent) this.select(cur.parent.n.pos); return; }
    if (dir === 'right') {
      if (cur.collapsed) { this.fold(cur.n.pos); return; }
      const mid = cur.kids[Math.floor((cur.kids.length - 1) / 2)]; if (mid) this.select(mid.n.pos); return;
    }
    const up = dir === 'up';
    const pick = list => list.filter(it => up ? it.y < cur.y : it.y > cur.y).sort((a, b) => Math.abs(a.y - cur.y) - Math.abs(b.y - cur.y))[0];
    const next = pick(this.nodes.filter(it => it.depth === cur.depth)) || pick(this.nodes);
    if (next) this.select(next.n.pos);
  }

  down(e) {
    if (e.button !== 0 || this.editing || e.target.closest?.('input')) return;
    const el = e.target.closest?.('.mm-node');
    this.host.focus({ preventScroll: true });
    if (!el) { this.press = { pan: true, x: e.clientX, y: e.clientY, left: this.host.scrollLeft, top: this.host.scrollTop }; this.host.classList.add('panning'); }
    else this.press = { el, pos: this.posOf(el), x: e.clientX, y: e.clientY, action: e.target.closest('.mm-fold') ? 'fold' : e.target.closest('.mm-check') ? 'check' : null };
  }
  move(e) {
    const p = this.press; if (!p) return;
    if (p.pan) { this.host.scrollLeft = p.left - (e.clientX - p.x); this.host.scrollTop = p.top - (e.clientY - p.y); return; }
    if (!p.drag) {
      const node = ops.findNode(this.tree, p.pos);
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5 || this.readOnly() || !node || !draggable(node)) return;
      const ghost = p.el.cloneNode(true); ghost.className = 'mm-ghost'; ghost.style.cssText = `width:${p.el.style.width};min-height:${p.el.style.minHeight}`;
      this.host.ownerDocument.body.append(ghost);
      p.el.classList.add('dragging'); this.host.classList.add('dragging');
      p.drag = { node, ghost };
    }
    p.drag.ghost.style.transform = `translate(${e.clientX + 10}px,${e.clientY + 6}px)`;
    this.host.querySelectorAll('.drop-before,.drop-after,.drop-child').forEach(el => el.classList.remove('drop-before', 'drop-after', 'drop-child'));
    p.drag.drop = null;
    const hit = this.host.ownerDocument.elementFromPoint?.(e.clientX, e.clientY)?.closest?.('.mm-node');
    if (hit && hit !== p.el) {
      const r = hit.getBoundingClientRect(), ratio = r.height ? (e.clientY - r.top) / r.height : .5;
      const zone = ratio < .3 ? 'before' : ratio > .7 ? 'after' : 'child';
      const target = ops.findNode(this.tree, this.posOf(hit)), drop = ops.resolveDrop(p.drag.node, target, zone);
      if (drop) { this.elFor(drop.target.pos)?.classList.add('drop-' + drop.mode); p.drag.drop = { target: target.pos, zone }; }
    }
    const box = this.host.getBoundingClientRect(), edge = 36;
    if (e.clientX > box.right - edge) this.host.scrollLeft += 12; else if (e.clientX < box.left + edge) this.host.scrollLeft -= 12;
    if (e.clientY > box.bottom - edge) this.host.scrollTop += 12; else if (e.clientY < box.top + edge) this.host.scrollTop -= 12;
  }
  up() {
    const p = this.press; if (!p) return;
    this.cancelPress();
    if (p.pan) return;
    if (p.drag) { if (p.drag.drop) this.apply(ops.moveNode(this.editor, p.pos, p.drag.drop.target, p.drag.drop.zone)); else this.render(); return; }
    if (p.action === 'fold') { this.select(p.pos); this.fold(p.pos); }
    else if (p.action === 'check' && !this.readOnly()) this.apply(ops.toggleCheck(this.editor, p.pos));
    else {
      // A second click on the same node within 450ms edits it, without relying on the browser's dblclick target.
      const now = Date.now(), again = this.lastClick.pos === p.pos && now - this.lastClick.at < 450;
      this.lastClick = again ? { pos: undefined, at: 0 } : { pos: p.pos, at: now };
      this.select(p.pos);
      if (again) this.startEdit(p.pos);
    }
  }
  cancelPress() {
    const p = this.press; this.press = null;
    this.host.classList.remove('panning', 'dragging');
    if (p?.drag) { p.drag.ghost.remove(); p.el.classList.remove('dragging'); }
    this.host.querySelectorAll('.drop-before,.drop-after,.drop-child').forEach(el => el.classList.remove('drop-before', 'drop-after', 'drop-child'));
  }
}
export { isInside };
