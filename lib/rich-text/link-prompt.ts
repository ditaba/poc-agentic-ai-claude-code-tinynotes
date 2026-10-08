import { Extension, type Editor } from '@tiptap/core';
import { isAllowedHref } from '@/lib/rich-text/extensions';

const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;

// Adds, edits or removes the link at the selection via window.prompt (EDIT-1).
export function promptForLink(editor: Editor): void {
  const current = editor.getAttributes('link').href;
  const input = window.prompt(
    'Link URL (leave empty to remove the link)',
    typeof current === 'string' ? current : 'https://',
  );
  if (input === null) return;

  const chain = () => editor.chain().focus().extendMarkRange('link');
  const href = input.trim();
  if (href === '') {
    chain().unsetLink().run();
    return;
  }

  const url = HAS_PROTOCOL.test(href) ? href : `https://${href}`;
  if (!isAllowedHref(url)) {
    window.alert('Links must start with http://, https:// or mailto:.');
    return;
  }
  chain().setLink({ href: url }).run();
}

// Opens the link prompt with Ctrl/⌘+K. Editor-only, so it stays out of the
// shared noteExtensions list used by the server.
export const LinkShortcut = Extension.create({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        promptForLink(this.editor);
        // Handled: stops the browser's own Ctrl/⌘+K.
        return true;
      },
    };
  },
});
