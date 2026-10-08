'use client';

import type { JSONContent } from '@tiptap/core';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { useActionState } from 'react';
import { createNote, updateNote } from '@/app/notes/actions';
import { NoteEditor, useNoteEditor } from '@/components/note-editor';
import { buttonStyles, inputStyles, labelStyles } from '@/components/styles';
import { SubmitButton } from '@/components/submit-button';
import { Switch } from '@/components/switch';
import { readField } from '@/lib/form-data';
import { MAX_TITLE_LENGTH } from '@/lib/note-limits';
import { EMPTY_DOC } from '@/lib/rich-text/extensions';

type NoteFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; noteId: string; initialTitle: string; initialContent: JSONContent };

type FormState = {
  error: string | null;
  saved: boolean;
  title: string;
  isShared: boolean;
};

const NETWORK_ERROR = "Couldn't save your note. Check your connection and try again.";

const CONTENT_LABEL_ID = 'note-content-label';
const SHARE_HINT_ID = 'share-hint';

export function NoteForm(props: NoteFormProps) {
  const isEdit = props.mode === 'edit';
  const editor = useNoteEditor({
    labelId: CONTENT_LABEL_ID,
    content: isEdit ? props.initialContent : undefined,
  });
  const [state, formAction] = useActionState(submit, {
    error: null,
    saved: false,
    title: isEdit ? props.initialTitle : '',
    isShared: false,
  });

  async function submit(_previous: FormState, formData: FormData): Promise<FormState> {
    const title = readField(formData, 'title');
    const isShared = formData.get('isShared') === 'on';
    // Read only on submit, so typing doesn't re-render the form. Sent as a string
    // because ProseMirror's attribute objects can't be Server Action arguments.
    const content = JSON.stringify(editor?.getJSON() ?? EMPTY_DOC);

    // The title and switch are returned in every case, so they keep their values
    // after React resets the form. The editor isn't a form field, so its content
    // always survives.
    try {
      const result =
        props.mode === 'edit'
          ? await updateNote(props.noteId, { title, content })
          : await createNote({ title, content, isShared });
      // Creating redirects to the new note's edit page, so only edits and errors
      // come back here.
      return { error: result.ok ? null : result.message, saved: result.ok, title, isShared };
    } catch (err) {
      // The redirect after creating arrives as a rejected promise; let Next.js handle it.
      unstable_rethrow(err);
      // Anything else is a failed request (e.g. offline). Keep the note (AS-5).
      return { error: NETWORK_ERROR, saved: false, title, isShared };
    }
  }

  return (
    <form action={formAction} className='mt-6 flex flex-col gap-6'>
      <div className='flex flex-col gap-1.5'>
        <label htmlFor='title' className={labelStyles}>
          Title
        </label>
        <input
          id='title'
          name='title'
          type='text'
          maxLength={MAX_TITLE_LENGTH}
          placeholder='Untitled'
          autoComplete='off'
          defaultValue={state.title}
          className={inputStyles}
        />
      </div>

      <div className='flex flex-col gap-1.5'>
        {/* Not a <label>: the editor is a contenteditable, which labels can't target. */}
        <span id={CONTENT_LABEL_ID} className={labelStyles}>
          Content
        </span>
        <NoteEditor editor={editor} />
      </div>

      {/* Existing notes share through the panel below the form, which acts instantly. */}
      {!isEdit && (
        <div className='flex items-start justify-between gap-4 rounded-2xl border border-aqua-100 bg-white p-4'>
          <div>
            <label htmlFor='isShared' className={labelStyles}>
              Share publicly
            </label>
            <p id={SHARE_HINT_ID} className='mt-1 text-sm text-slate-500'>
              Anyone with the link can read this note. You can turn this off later.
            </p>
          </div>
          <Switch
            id='isShared'
            name='isShared'
            defaultChecked={state.isShared}
            aria-describedby={SHARE_HINT_ID}
          />
        </div>
      )}

      <p aria-live='polite' className='min-h-5 text-sm'>
        {state.error ? (
          <span className='text-rose-600'>{state.error}</span>
        ) : state.saved ? (
          <span className='text-aqua-700'>Changes saved.</span>
        ) : null}
      </p>

      <div className='flex items-center justify-end gap-3'>
        <Link href='/dashboard' className={buttonStyles.secondary}>
          {isEdit ? 'Back to notes' : 'Cancel'}
        </Link>
        <SubmitButton pendingLabel='Saving…'>
          {isEdit ? 'Save changes' : 'Create note'}
        </SubmitButton>
      </div>
    </form>
  );
}
