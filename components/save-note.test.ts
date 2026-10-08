import { redirect } from 'next/navigation';
import { describe, expect, test, vi } from 'vitest';
import { createNote, updateNote } from '@/app/notes/actions';
import { saveNote } from './save-note';

vi.mock('@/app/notes/actions', () => ({ createNote: vi.fn(), updateNote: vi.fn() }));

const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
const fields = { title: 'Plan', content, isShared: true };

describe('saveNote', () => {
  test('updates an existing note and reports it saved', async () => {
    vi.mocked(updateNote).mockResolvedValue({ ok: true, data: { updatedAt: 1 } });

    const state = await saveNote({ mode: 'edit', noteId: 'n1' }, fields);

    // Sharing on existing notes goes through the share panel, not the form.
    expect(updateNote).toHaveBeenCalledWith('n1', { title: 'Plan', content });
    expect(state).toEqual({
      error: null,
      signedOut: false,
      saved: true,
      title: 'Plan',
      isShared: true,
    });
  });

  test('creates a note with the sharing choice and lets Next.js follow the redirect', async () => {
    vi.mocked(createNote).mockImplementation(async () => redirect('/notes/n1/edit'));

    await expect(saveNote({ mode: 'create' }, fields)).rejects.toThrow('NEXT_REDIRECT');
    expect(createNote).toHaveBeenCalledWith({ title: 'Plan', content, isShared: true });
  });

  test('shows the error and keeps the title and switch when saving fails', async () => {
    vi.mocked(createNote).mockResolvedValue({
      ok: false,
      code: 'VALIDATION',
      message: 'Titles can be at most 200 characters.',
    });

    expect(await saveNote({ mode: 'create' }, fields)).toEqual({
      error: 'Titles can be at most 200 characters.',
      signedOut: false,
      saved: false,
      title: 'Plan',
      isShared: true,
    });
  });

  test('offers to sign in again when the session has ended', async () => {
    vi.mocked(updateNote).mockResolvedValue({
      ok: false,
      code: 'UNAUTHENTICATED',
      message: "You've been signed out.",
    });

    const state = await saveNote({ mode: 'edit', noteId: 'n1' }, fields);

    expect(state).toMatchObject({ error: "You've been signed out.", signedOut: true });
  });

  test('keeps the note when the request fails', async () => {
    vi.mocked(updateNote).mockRejectedValue(new TypeError('Failed to fetch'));

    const state = await saveNote({ mode: 'edit', noteId: 'n1' }, fields);

    expect(state).toMatchObject({
      error: "Couldn't save your note. Check your connection and try again.",
      saved: false,
      title: 'Plan',
    });
  });
});
