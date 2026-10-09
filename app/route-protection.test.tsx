import { notFound, redirect } from 'next/navigation';
import { describe, expect, test, vi } from 'vitest';
import { db } from '@/lib/db';
import * as notes from '@/lib/notes';
import { createTestUser } from '@/test/db';
import { pageProps, renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import AuthPage from './auth/page';
import DashboardPage from './dashboard/page';
import EditNotePage, { generateMetadata as generateEditMetadata } from './notes/[id]/edit/page';
import NotePage from './notes/[id]/page';
import NewNotePage from './notes/new/page';
import HomePage from './page';
import SharedNotePage from './s/[token]/page';

// Every page checks the session itself; there's no middleware (CLAUDE.md).

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}));
// Real redirect() and notFound(), with call tracking.
vi.mock('next/navigation', { spy: true });

const content = { type: 'doc', content: [{ type: 'paragraph' }] };

const protectedPages = {
  '/dashboard': () => DashboardPage(),
  '/notes/new': () => NewNotePage(),
  '/notes/[id]': () => NotePage(pageProps({ id: 'any' })),
  '/notes/[id]/edit': () => EditNotePage(pageProps({ id: 'any' })),
  '/notes/[id]/edit metadata': () => generateEditMetadata(pageProps({ id: 'any' })),
};

describe('signed-out visitors', () => {
  test.each(Object.entries(protectedPages))('are sent from %s to /auth', async (_route, open) => {
    signInAs(null);
    await expect(open()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth');
  });

  test('can open the landing and auth pages', async () => {
    signInAs(null);
    await HomePage();
    await AuthPage(pageProps({}, { mode: 'sign-up' }));
    expect(redirect).not.toHaveBeenCalled();
  });

  test('can open a public link', async () => {
    const owner = await createTestUser(db);
    const { id } = await notes.createNote(db, owner.id, { title: 'Shared plan', content });
    const token = (await notes.enableSharing(db, owner.id, id)) ?? '';
    signInAs(null);

    const html = await renderPage(SharedNotePage(pageProps({ token })));

    expect(html).toContain('Shared plan');
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('signed-in visitors', () => {
  test.each([
    ['/', () => HomePage()],
    ['/auth', () => AuthPage(pageProps({}))],
  ])('are sent from %s to /dashboard', async (_route, open) => {
    signInAs(await createTestUser(db));
    await expect(open()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  test('can open the dashboard and the new note page', async () => {
    signInAs(await createTestUser(db));
    await renderPage(DashboardPage());
    await renderPage(NewNotePage());
    expect(redirect).not.toHaveBeenCalled();
  });

  test('are sent from /notes/[id] to the edit page', async () => {
    signInAs(await createTestUser(db));
    await expect(NotePage(pageProps({ id: 'n1' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/notes/n1/edit');
  });

  test("get the 404 page, never a 403, for another user's note (NOTE-4)", async () => {
    const owner = await createTestUser(db);
    const { id } = await notes.createNote(db, owner.id, { title: 'Private', content });
    signInAs(await createTestUser(db));

    await expect(EditNotePage(pageProps({ id }))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateEditMetadata(pageProps({ id }))).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    expect(notFound).toHaveBeenCalled();
  });
});
