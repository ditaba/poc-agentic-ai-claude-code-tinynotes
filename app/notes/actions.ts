'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { db } from '@/lib/db';
import { AppError, toActionError, type ActionResult } from '@/lib/errors';
import { parseNoteInput, readShareFlag } from '@/lib/note-input';
import * as notes from '@/lib/notes';
import { getCurrentUser } from '@/lib/session';
import { shareUrlFor } from '@/lib/share-url';

type LogContext = { action: string; userId?: string; noteId?: string };

const NOTE_NOT_FOUND = 'This note no longer exists.';

// Turns failures into ActionResults (ERR-2). Next's own control-flow errors,
// such as redirect() and notFound(), are re-thrown untouched.
async function withAction<T>(
  action: string,
  run: (context: LogContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const context: LogContext = { action };
  try {
    return await run(context);
  } catch (err) {
    unstable_rethrow(err);
    // AppErrors are expected and user-facing. Never log note content (ERR-3).
    if (!(err instanceof AppError)) console.error('Server action failed', context, err);
    return toActionError(err);
  }
}

// Actions report a missing session instead of redirecting, so the form keeps
// the user's content (ERR-1).
async function requireActionUser(context: LogContext) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError('UNAUTHENTICATED', "You've been signed out.");
  }
  context.userId = user.id;
  return user;
}

// Ids arrive as untrusted input. Anything that can't be a note id is reported
// like a missing note (NOTE-4).
function parseNoteId(id: unknown, context: LogContext): string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
    throw new AppError('NOT_FOUND', NOTE_NOT_FOUND);
  }
  context.noteId = id;
  return id;
}

export async function createNote(input: unknown): Promise<ActionResult> {
  const result = await withAction('createNote', async (context) => {
    const user = await requireActionUser(context);
    const note = parseNoteInput(input);
    const { id } = await notes.createNote(db, user.id, note, { shared: readShareFlag(input) });
    return { ok: true, data: { id } };
  });
  if (!result.ok) return result;

  // Outside withAction's try/catch, because redirect() works by throwing. The
  // edit page shows the new public link right away when sharing is on.
  revalidatePath('/dashboard');
  redirect(`/notes/${result.data.id}/edit`);
}

export async function updateNote(
  id: unknown,
  input: unknown,
): Promise<ActionResult<{ updatedAt: number }>> {
  return withAction('updateNote', async (context) => {
    const user = await requireActionUser(context);
    const noteId = parseNoteId(id, context);
    const saved = await notes.updateNote(db, user.id, noteId, parseNoteInput(input));
    if (!saved) throw new AppError('NOT_FOUND', NOTE_NOT_FOUND);

    revalidatePath('/dashboard');
    return { ok: true, data: saved };
  });
}

export async function enableSharing(id: unknown): Promise<ActionResult<{ shareUrl: string }>> {
  return withAction('enableSharing', async (context) => {
    const user = await requireActionUser(context);
    const token = await notes.enableSharing(db, user.id, parseNoteId(id, context));
    if (!token) throw new AppError('NOT_FOUND', NOTE_NOT_FOUND);

    revalidatePath('/dashboard');
    return { ok: true, data: { shareUrl: shareUrlFor(token) } };
  });
}

export async function disableSharing(id: unknown): Promise<ActionResult> {
  return withAction('disableSharing', async (context) => {
    const user = await requireActionUser(context);
    if (!(await notes.disableSharing(db, user.id, parseNoteId(id, context)))) {
      throw new AppError('NOT_FOUND', NOTE_NOT_FOUND);
    }

    revalidatePath('/dashboard');
    return { ok: true, data: undefined };
  });
}
