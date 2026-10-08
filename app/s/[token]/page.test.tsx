import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { describe, expect, test, vi } from 'vitest';
import { db } from '@/lib/db';
import * as notes from '@/lib/notes';
import { createTestUser } from '@/test/db';
import { pageProps, renderPage } from '@/test/next';
import SharedNotePage, { generateMetadata } from './page';

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: vi.fn(async () => {}),
}));
vi.mock('next/navigation', { spy: true });
// Real data access, with call tracking.
vi.mock('@/lib/notes', { spy: true });

const content = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Budget review' }] },
  ],
};

function shareNote(title = 'Team meeting') {
  const owner = createTestUser(db, 'Ada Lovelace');
  const { id } = notes.createNote(db, owner.id, { title, content });
  const token = notes.enableSharing(db, owner.id, id) ?? '';
  return { owner, id, token };
}

const open = (token: string) => renderPage(SharedNotePage(pageProps({ token })));

describe('shared note page', () => {
  test('shows the title, the last-updated date and the formatted content (PUB-1)', async () => {
    const { token } = shareNote();

    const html = await open(token);

    expect(html).toMatch(/<h1[^>]*>Team meeting<\/h1>/);
    expect(html).toContain('Last updated <time');
    expect(html).toContain('<h2>Agenda</h2><p>Budget review</p>');
  });

  test('shows neither the author nor any edit controls (D6)', async () => {
    const { owner, token } = shareNote();

    const html = await open(token);

    expect(html).not.toContain('Ada Lovelace');
    expect(html).not.toContain(owner.id);
    expect(html).not.toMatch(/<form|<button|contenteditable|Delete|Save/i);
  });

  test('invites visitors to sign up', async () => {
    const html = await open(shareNote().token);
    expect(html).toMatch(/<a[^>]*href="\/auth\?mode=sign-up"[^>]*>Create your own notes<\/a>/);
  });

  test('shows "Untitled" for notes without a title', async () => {
    const { token } = shareNote('');
    expect(await open(token)).toMatch(/<h1[^>]*>Untitled<\/h1>/);
    expect((await generateMetadata(pageProps({ token }))).title).toBe('Untitled');
  });

  test('escapes the title', async () => {
    const { token } = shareNote('<script>alert(1)</script>');
    const html = await open(token);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;');
  });

  test('is rendered per request, so a revoked link stops working at once (PUB-3)', async () => {
    const { owner, id, token } = shareNote();
    await open(token);
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(notes.getSharedNote).mock.invocationCallOrder[0],
    );

    notes.disableSharing(db, owner.id, id);
    await expect(open(token)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  test('gives unknown tokens the same 404 (PUB-2)', async () => {
    await expect(open('a'.repeat(32))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(notFound).toHaveBeenCalled();
  });

  test.each(['abc', 'a'.repeat(33), `${'a'.repeat(31)}=`, '..%2F..%2Fapp.db', "' or 1=1 --"])(
    'gives the malformed token %j the 404 without querying the database',
    async (token) => {
      await expect(open(token)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      expect(notes.getSharedNote).not.toHaveBeenCalled();
    },
  );
});

describe('shared note metadata', () => {
  test('uses the note title and keeps the page private (PUB-4)', async () => {
    const { token } = shareNote();
    expect(await generateMetadata(pageProps({ token }))).toEqual({
      title: 'Team meeting',
      robots: { index: false, follow: false },
      referrer: 'no-referrer',
    });
  });

  test('says "Page not found" for unknown tokens', async () => {
    expect(await generateMetadata(pageProps({ token: 'abc' }))).toMatchObject({
      title: 'Page not found',
      robots: { index: false, follow: false },
    });
  });
});
