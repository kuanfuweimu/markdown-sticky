import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';

export function indentRich(editor) {
  if (editor.isActive('listItem')) { editor.commands.sinkListItem('listItem'); return true; }
  if (editor.isActive('taskItem')) { editor.commands.sinkListItem('taskItem'); return true; }
  return editor.commands.insertContent('    ');
}
export function outdentRich(editor) {
  if (editor.isActive('listItem')) { editor.commands.liftListItem('listItem'); return true; }
  if (editor.isActive('taskItem')) { editor.commands.liftListItem('taskItem'); return true; }
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
  return [StarterKit.configure({ link: { openOnClick: false }, underline: false }), TaskList, TaskItem.configure({ nested: true }), Markdown, Placeholder.configure({ placeholder: 'Write something…' }), StickyKeys];
}
export function requiresSource(md) {
  return /!\[|<\/?[a-zA-Z][^>]*>|^\s*\|.*\||^\s*\[\^|^---\s*\n[\s\S]*?\n---|^\s*[^\n]+\|[^\n]*\n\s*[:| -]+\|/m.test(md);
}
