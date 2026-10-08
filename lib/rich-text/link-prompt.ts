import { Extension, type Editor } from '@tiptap/core';
import { isAllowedHref } from '@/lib/rich-text/extensions';

const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;

export type LinkChange = { type: 'remove' } | { type: 'set'; href: string } | { type: 'invalid' };

// Turns what the user typed into a link change. Empty input removes the link,
// and addresses without a protocol (e.g. "example.com") get https://.
export function parseLinkInput(input: string): LinkChange {
  const href = input.trim();
  if (href === '') return { type: 'remove' };

  const url = HAS_PROTOCOL.test(href) ? href : `https://${href}`;
  return isAllowedHref(url) ? { type: 'set', href: url } : { type: 'invalid' };
}

// Adds, edits or removes the link at the selection via window.prompt (EDIT-1).
export function promptForLink(editor: Editor): void {
  const current = editor.getAttributes('link').href;
  const input = window.prompt(
    'Link URL (leave empty to remove the link)',
    typeof current === 'string' ? current : 'https://',
  );
  if (input === null) return;

  const change = parseLinkInput(input);
  const chain = () => editor.chain().focus().extendMarkRange('link');
  switch (change.type) {
    case 'remove':
      chain().unsetLink().run();
      return;
    case 'set':
      chain().setLink({ href: change.href }).run();
      return;
    case 'invalid':
      window.alert('Links must start with http://, https:// or mailto:.');
  }
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
