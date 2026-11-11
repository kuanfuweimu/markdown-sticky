import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { Outline } from './outline.js';

// Tab / Shift+Tab on a heading moves it down / up one outline level, matching how they nest list items.
export function indentRich(editor) {
  if (editor.isActive('listItem')) { editor.commands.sinkListItem('listItem'); return true; }
  if (editor.isActive('taskItem')) { editor.commands.sinkListItem('taskItem'); return true; }
  if (editor.isActive('heading')) { const level = editor.getAttributes('heading').level; if (level < 6) editor.commands.setHeading({ level: level + 1 }); return true; }
  return editor.commands.insertContent('    ');
}
export function outdentRich(editor) {
  if (editor.isActive('listItem')) { editor.commands.liftListItem('listItem'); return true; }
  if (editor.isActive('taskItem')) { editor.commands.liftListItem('taskItem'); return true; }
  if (editor.isActive('heading')) { const level = editor.getAttributes('heading').level; if (level > 1) editor.commands.setHeading({ level: level - 1 }); return true; }
  const { $from } = editor.state.selection;
  const before = $from.parent.textBetween(0, $from.parentOffset);
  const spaces = before.match(/ {1,4}$/)?.[0].length || 0;
  if (spaces) editor.commands.deleteRange({ from: $from.pos - spaces, to: $from.pos });
  return true;
}
const StickyKeys = Extension.create({
  name: 'stickyKeys', priority: 1100,
  addKeyboardShortcuts() { return { Tab: () => indentRich(this.editor), 'Shift-Tab': () => outdentRich(this.editor) }; },
});
export function richExtensions() {
  return [StarterKit.configure({ link: { openOnClick: false }, underline: false }), TaskList, TaskItem.configure({ nested: true }), Markdown, Placeholder.configure({ placeholder: 'Write something…' }), StickyKeys, Outline];
}
export function requiresSource(md) {
  return /!\[|<\/?[a-zA-Z][^>]*>|^\s*\|.*\||^\s*\[\^|^---\s*\n[\s\S]*?\n---|^\s*[^\n]+\|[^\n]*\n\s*[:| -]+\|/m.test(md);
}
