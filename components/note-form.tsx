"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { createNote } from "@/app/notes/actions";
import { NoteEditor, useNoteEditor } from "@/components/note-editor";
import { buttonStyles, inputStyles, labelStyles } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { readField } from "@/lib/form-data";
import type { NoteSubmission } from "@/lib/note-input";
import { MAX_TITLE_LENGTH } from "@/lib/note-limits";
import { EMPTY_DOC } from "@/lib/rich-text/extensions";

type FormState = {
  error: string | null;
  title: string;
};

const initialState: FormState = { error: null, title: "" };

const NETWORK_ERROR = "Couldn't save your note. Check your connection and try again.";

const CONTENT_LABEL_ID = "note-content-label";

export function NoteForm() {
  const editor = useNoteEditor({ labelId: CONTENT_LABEL_ID });
  const [state, formAction] = useActionState(submit, initialState);

  async function submit(_previous: FormState, formData: FormData): Promise<FormState> {
    const submission: NoteSubmission = {
      title: readField(formData, "title"),
      // Read only on submit, so typing doesn't re-render the form. Sent as a string
      // because ProseMirror's attribute objects can't be Server Action arguments.
      content: JSON.stringify(editor?.getJSON() ?? EMPTY_DOC),
    };
    // The title is returned in every case, so the field keeps its value after React
    // resets the form. The editor isn't a form field, so its content always survives.
    try {
      const result = await createNote(submission);
      // On success the action redirects to the dashboard, so only errors come back.
      return { error: result.ok ? null : result.message, title: submission.title };
    } catch (err) {
      // The success redirect arrives as a rejected promise; let Next.js handle it.
      unstable_rethrow(err);
      // Anything else is a failed request (e.g. offline). Keep the note (AS-5).
      return { error: NETWORK_ERROR, title: submission.title };
    }
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelStyles}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={MAX_TITLE_LENGTH}
          placeholder="Untitled"
          autoComplete="off"
          defaultValue={state.title}
          className={inputStyles}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Not a <label>: the editor is a contenteditable, which labels can't target. */}
        <span id={CONTENT_LABEL_ID} className={labelStyles}>
          Content
        </span>
        <NoteEditor editor={editor} />
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-rose-600">
        {state.error}
      </p>

      <div className="flex items-center justify-end gap-3">
        <Link href="/dashboard" className={buttonStyles.secondary}>
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving…">Create note</SubmitButton>
      </div>
    </form>
  );
}
