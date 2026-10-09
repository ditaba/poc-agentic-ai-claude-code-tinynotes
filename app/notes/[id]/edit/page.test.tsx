import { describe, expect, test, vi } from 'vitest';
import { db } from '@/lib/db';
import * as notes from '@/lib/notes';
import { createTestUser } from '@/test/db';
import { pageProps, renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import EditNotePage, { generateMetadata } from './page';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', { spy: true });

const content = { type: 'doc', content: [{ type: 'paragraph' }] };

async function ownNote(title = 'Plan') {
  const owner = await createTestUser(db);
  const { id } = await notes.createNote(db, owner.id, { title, content });
  signInAs(owner);
  return { owner, id };
}

const open = (id: string) => renderPage(EditNotePage(pageProps({ id })));

describe('edit note page', () => {
  test('shows the form filled in with the note', async () => {
    const { id } = await ownNote('Groceries');

    const html = await open(id);

    expect(html).toMatch(/<h1[^>]*>Edit note<\/h1>/);
    expect(html).toMatch(/<input[^>]*name="title"[^>]*value="Groceries"/);
    expect(html).toContain('Save changes');
    expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>Back to notes<\/a>/);
  });

  test('shows sharing as off for a private note', async () => {
    const { id } = await ownNote();

    const html = await open(id);

    expect(html).toContain('Only you can see this note.');
    expect(html).not.toMatch(/role="switch"[^>]*\schecked=""/);
    expect(html).not.toContain('/s/');
  });

  test('shows the public link for a shared note', async () => {
    const { owner, id } = await ownNote();
    const token = await notes.enableSharing(db, owner.id, id);

    const html = await open(id);

    expect(html).toMatch(/role="switch"[^>]*\schecked=""/);
    expect(html).toContain(`value="http://localhost:3000/s/${token}"`);
  });

  test('gives unknown ids the 404 page', async () => {
    await ownNote();
    await expect(open('no-such-note')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  test('uses the note title as the page title, or "Untitled"', async () => {
    expect(await generateMetadata(pageProps({ id: (await ownNote('Groceries')).id }))).toEqual({
      title: 'Groceries',
    });
    expect(await generateMetadata(pageProps({ id: (await ownNote('')).id }))).toEqual({
      title: 'Untitled',
    });
  });
});
