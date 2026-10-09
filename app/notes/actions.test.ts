import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { db } from '@/lib/db';
import * as notes from '@/lib/notes';
import { createTestUser } from '@/test/db';
import { signInAs } from '@/test/session';
import { createNote, disableSharing, enableSharing, updateNote } from './actions';

// Next.js request APIs only work inside a request. redirect() stays real, so
// the actions behave as in the app, and calls are tracked.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', { spy: true });

const GENERIC = 'Something went wrong. Please try again.';
const NOT_FOUND = { ok: false, code: 'NOT_FOUND', message: 'This note no longer exists.' };
const SIGNED_OUT = { ok: false, code: 'UNAUTHENTICATED', message: "You've been signed out." };

const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});
// What the note form sends: the editor's JSON as a string.
const submission = (title: string, text = 'Hello') => ({
  title,
  content: JSON.stringify(doc(text)),
});

let ada: { id: string };
let bob: { id: string };

// The database lives for the whole file, so each test gets new users.
beforeEach(async () => {
  ada = await createTestUser(db, 'Ada');
  bob = await createTestUser(db, 'Bob');
  signInAs(ada);
});

async function addNote(userId = ada.id, title = 'Plan') {
  return (await notes.createNote(db, userId, { title, content: doc('Original') })).id;
}

describe('createNote', () => {
  test('saves the note, refreshes the dashboard and opens the edit page', async () => {
    await expect(createNote(submission('  Groceries  '))).rejects.toThrow('NEXT_REDIRECT');

    const [note] = await notes.listNotes(db, ada.id);
    expect(note).toMatchObject({ title: 'Groceries', isShared: false });
    expect((await notes.getNote(db, ada.id, note.id))?.content).toEqual(doc('Hello'));
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(redirect).toHaveBeenCalledWith(`/notes/${note.id}/edit`);
  });

  test('turns on sharing when asked', async () => {
    await expect(createNote({ ...submission('Shared'), isShared: true })).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    const [note] = await notes.listNotes(db, ada.id);
    expect(note.isShared).toBe(true);
    expect((await notes.getNote(db, ada.id, note.id))?.shareToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  test('only shares for an explicit true', async () => {
    await expect(createNote({ ...submission('Not shared'), isShared: 'true' })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect((await notes.listNotes(db, ada.id))[0].isShared).toBe(false);
  });

  test('returns validation errors without saving anything', async () => {
    expect(await createNote(submission('x'.repeat(201)))).toEqual({
      ok: false,
      code: 'VALIDATION',
      message: 'Titles can be at most 200 characters.',
    });

    const unsafeLink = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    };
    expect(await createNote({ title: '', content: JSON.stringify(unsafeLink) })).toMatchObject({
      ok: false,
      code: 'VALIDATION',
    });

    expect(await notes.listNotes(db, ada.id)).toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });

  test('reports a signed-out user instead of redirecting, so the form keeps the note', async () => {
    signInAs(null);

    expect(await createNote(submission('Plan'))).toEqual(SIGNED_OUT);
    expect(redirect).not.toHaveBeenCalled();
  });

  test('hides unexpected errors from the user and logs them without the note', async () => {
    vi.spyOn(db, 'execute').mockRejectedValue(new Error('SQLITE_FULL: database or disk is full'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createNote(submission('Secret plan', 'Secret text'));

    expect(result).toEqual({ ok: false, code: 'INTERNAL', message: GENERIC });
    expect(log).toHaveBeenCalledWith(
      'Server action failed',
      { action: 'createNote', userId: ada.id },
      expect.any(Error),
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Secret/);
  });
});

describe('updateNote', () => {
  test('saves the title and content and refreshes the dashboard', async () => {
    const id = await addNote();

    const result = await updateNote(id, submission(' New title ', 'Edited'));

    const note = await notes.getNote(db, ada.id, id);
    expect(result).toEqual({ ok: true, data: { updatedAt: note?.updatedAt } });
    expect(note).toMatchObject({ title: 'New title', content: doc('Edited') });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  test("treats another user's note as missing and leaves it unchanged (NOTE-4)", async () => {
    const id = await addNote(ada.id);
    signInAs(bob);

    expect(await updateNote(id, submission('Hijacked'))).toEqual(NOT_FOUND);
    expect((await notes.getNote(db, ada.id, id))?.title).toBe('Plan');
  });

  test.each([42, null, '', 'x'.repeat(65), 'no-such-note'])(
    'treats the id %j as a missing note',
    async (id) => {
      expect(await updateNote(id, submission('Plan'))).toEqual(NOT_FOUND);
    },
  );

  test('returns validation errors', async () => {
    const id = await addNote();
    expect(await updateNote(id, { title: 'Plan', content: doc('not a string') })).toEqual({
      ok: false,
      code: 'VALIDATION',
      message: "This note's content is invalid.",
    });
  });

  test('reports a signed-out user and changes nothing', async () => {
    const id = await addNote();
    signInAs(null);

    expect(await updateNote(id, submission('Changed'))).toEqual(SIGNED_OUT);
    expect((await notes.getNote(db, ada.id, id))?.title).toBe('Plan');
  });

  test('logs unexpected errors with the note id', async () => {
    const id = await addNote();
    vi.spyOn(db, 'execute').mockRejectedValue(new Error('SQLITE_IOERR'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await updateNote(id, submission('Plan'))).toEqual({
      ok: false,
      code: 'INTERNAL',
      message: GENERIC,
    });
    expect(log).toHaveBeenCalledWith(
      'Server action failed',
      { action: 'updateNote', userId: ada.id, noteId: id },
      expect.any(Error),
    );
  });

  test("doesn't log expected errors", async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await updateNote('no-such-note', submission('Plan'));
    expect(log).not.toHaveBeenCalled();
  });
});

describe('enableSharing', () => {
  test('returns a public link that shows the note', async () => {
    const id = await addNote();

    const result = await enableSharing(id);

    expect(result.ok).toBe(true);
    const shareUrl = result.ok ? result.data.shareUrl : '';
    expect(shareUrl).toMatch(/^http:\/\/localhost:3000\/s\/[A-Za-z0-9_-]{32}$/);
    const token = shareUrl.split('/s/')[1];
    expect((await notes.getSharedNote(db, token))?.title).toBe('Plan');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  test('keeps the same link when enabled twice (SHARE-2)', async () => {
    const id = await addNote();
    expect(await enableSharing(id)).toEqual(await enableSharing(id));
  });

  test('builds the link from BETTER_AUTH_URL', async () => {
    vi.stubEnv('BETTER_AUTH_URL', 'https://notes.example.com');
    const result = await enableSharing(await addNote());
    expect(result.ok && result.data.shareUrl).toMatch(/^https:\/\/notes\.example\.com\/s\//);
  });

  test("can't share another user's note", async () => {
    const id = await addNote(ada.id);
    signInAs(bob);

    expect(await enableSharing(id)).toEqual(NOT_FOUND);
    expect((await notes.getNote(db, ada.id, id))?.shareToken).toBeNull();
  });

  test('reports a signed-out user', async () => {
    const id = await addNote();
    signInAs(null);
    expect(await enableSharing(id)).toEqual(SIGNED_OUT);
  });
});

describe('disableSharing', () => {
  test('revokes the link for good (SHARE-3)', async () => {
    const id = await addNote();
    const token = (await notes.enableSharing(db, ada.id, id)) ?? '';

    expect(await disableSharing(id)).toEqual({ ok: true, data: undefined });
    expect(await notes.getSharedNote(db, token)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  test("can't revoke another user's link", async () => {
    const id = await addNote(ada.id);
    const token = (await notes.enableSharing(db, ada.id, id)) ?? '';
    signInAs(bob);

    expect(await disableSharing(id)).toEqual(NOT_FOUND);
    expect(await notes.getSharedNote(db, token)).not.toBeNull();
  });

  test('reports a signed-out user', async () => {
    const id = await addNote();
    signInAs(null);
    expect(await disableSharing(id)).toEqual(SIGNED_OUT);
  });
});
