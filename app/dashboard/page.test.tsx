import { describe, expect, test, vi } from 'vitest';
import { db } from '@/lib/db';
import * as notes from '@/lib/notes';
import { createTestUser } from '@/test/db';
import { renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import DashboardPage from './page';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const content = { type: 'doc', content: [{ type: 'paragraph' }] };

async function addNote(userId: string, title: string, updatedAt: number) {
  const { id } = await notes.createNote(db, userId, { title, content });
  await db.execute({
    sql: `update "note" set "updatedAt" = $updatedAt where "id" = $id`,
    args: { id, updatedAt },
  });
  return id;
}

describe('dashboard', () => {
  test('shows an empty state with a link to create the first note', async () => {
    signInAs(await createTestUser(db));

    const html = await renderPage(DashboardPage());

    expect(html).toContain('No notes yet');
    expect(html).toMatch(/<a[^>]*href="\/notes\/new"[^>]*>Create your first note<\/a>/);
  });

  test("lists the user's notes newest first, each linking to its edit page", async () => {
    const user = await createTestUser(db);
    const older = await addNote(user.id, 'Older', 1_000);
    const newer = await addNote(user.id, 'Newer', 2_000);
    signInAs(user);

    const html = await renderPage(DashboardPage());

    expect(html.indexOf('Newer')).toBeLessThan(html.indexOf('Older'));
    expect(html).toMatch(new RegExp(`<a[^>]*href="/notes/${newer}/edit"[^>]*>Newer</a>`));
    expect(html).toMatch(new RegExp(`<a[^>]*href="/notes/${older}/edit"[^>]*>Older</a>`));
    expect(html).not.toContain('No notes yet');
  });

  test('marks shared notes and names untitled ones', async () => {
    const user = await createTestUser(db);
    const shared = await addNote(user.id, '', 2_000);
    await addNote(user.id, 'Private', 1_000);
    await notes.enableSharing(db, user.id, shared);
    signInAs(user);

    const html = await renderPage(DashboardPage());

    expect(html).toMatch(/>Untitled<\/a>/);
    expect(html.match(/>Shared</g)).toHaveLength(1);
    expect(html.indexOf('>Shared<')).toBeLessThan(html.indexOf('Private'));
  });

  test("never shows other users' notes", async () => {
    await addNote((await createTestUser(db)).id, "Someone else's note", 1_000);
    signInAs(await createTestUser(db));

    expect(await renderPage(DashboardPage())).not.toContain('Someone else');
  });
});
