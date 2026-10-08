import { unstable_rethrow } from 'next/navigation';
import { createNote, updateNote } from '@/app/notes/actions';

export type NoteFormState = {
  error: string | null;
  // The session ended: offer a sign-in link that keeps this page open (AS-5).
  signedOut: boolean;
  saved: boolean;
  title: string;
  isShared: boolean;
};

export type NoteTarget = { mode: 'create' } | { mode: 'edit'; noteId: string };

type NoteFields = {
  title: string;
  // The editor's JSON as a string: ProseMirror's attribute objects can't be
  // Server Action arguments.
  content: string;
  isShared: boolean;
};

const NETWORK_ERROR = "Couldn't save your note. Check your connection and try again.";

// Creates or updates the note and returns the form's next state. The title and
// switch are returned in every case, so they keep their values after React
// resets the form. Creating redirects to the new note's edit page, so it only
// returns on errors.
export async function saveNote(
  target: NoteTarget,
  { title, content, isShared }: NoteFields,
): Promise<NoteFormState> {
  try {
    const result =
      target.mode === 'edit'
        ? await updateNote(target.noteId, { title, content })
        : await createNote({ title, content, isShared });
    if (result.ok) return { error: null, signedOut: false, saved: true, title, isShared };
    return {
      error: result.message,
      signedOut: result.code === 'UNAUTHENTICATED',
      saved: false,
      title,
      isShared,
    };
  } catch (err) {
    // The redirect after creating arrives as a rejected promise; let Next.js handle it.
    unstable_rethrow(err);
    // Anything else is a failed request (e.g. offline). Keep the note (AS-5).
    return { error: NETWORK_ERROR, signedOut: false, saved: false, title, isShared };
  }
}
