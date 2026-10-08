import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import type { ReactNode } from 'react';
import { noteExtensions } from '@/lib/rich-text/extensions';
import { parseNoteContent } from '@/lib/rich-text/validate';

// Renders stored note content as React elements, without a DOM and without
// raw HTML: React escapes all text and attributes. The content is validated and
// sanitized again first, so rows saved before stricter rules came in are made
// safe at display time too (SEC-3).
export function renderNoteContent(content: unknown): ReactNode {
  return renderToReactElement({ extensions: noteExtensions, content: parseNoteContent(content) });
}
