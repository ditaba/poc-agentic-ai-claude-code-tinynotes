"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { EditorToolbar } from "@/components/editor-toolbar";
import { EMPTY_DOC, noteExtensions } from "@/lib/rich-text/extensions";
import { LinkShortcut } from "@/lib/rich-text/link-prompt";

// Module-level so useEditor sees the same array on every render.
const editorExtensions = [...noteExtensions, LinkShortcut];

type UseNoteEditorOptions = {
  // The id of the visible label for the content area.
  labelId: string;
  content?: JSONContent;
};

// The note editor's configuration, shared by the new and edit note forms.
export function useNoteEditor({ labelId, content = EMPTY_DOC }: UseNoteEditorOptions): Editor | null {
  return useEditor({
    extensions: editorExtensions,
    content,
    // Render on the client only, avoiding hydration mismatches.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-a:text-aqua-700 min-h-64 max-w-none px-4 py-3 focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
      },
    },
  });
}

// The bordered editing area: toolbar plus content. The box doesn't clip its
// children, so the sticky toolbar and its tooltips work.
export function NoteEditor({ editor }: { editor: Editor | null }) {
  return (
    <div className="rounded-lg border border-aqua-200 bg-white has-[.ProseMirror-focused]:border-aqua-400 has-[.ProseMirror-focused]:ring-2 has-[.ProseMirror-focused]:ring-aqua-400 has-[.ProseMirror-focused]:ring-offset-2">
      {/* useEditorState reads the editor it starts with, so mount the toolbar only once
          the editor exists. Until then, an empty bar keeps the layout from jumping. */}
      {editor ? (
        <EditorToolbar editor={editor} />
      ) : (
        <div className="h-11 rounded-t-[calc(var(--radius-lg)-1px)] border-b border-aqua-100 bg-aqua-50" />
      )}
      <EditorContent editor={editor} className="min-h-64" />
    </div>
  );
}
