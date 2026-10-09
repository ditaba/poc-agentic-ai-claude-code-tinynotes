import type { Client } from '@libsql/client';
import { describe, expect, test } from 'vitest';
import {
  createNote,
  disableSharing,
  enableSharing,
  getNote,
  getSharedNote,
  listNotes,
  updateNote,
} from './notes';
import { createTestDb, createTestUser } from '@/test/db';

const content = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
};

// Sets columns directly, e.g. to push timestamps into the past.
async function setNote(db: Client, id: string, set: string) {
  await db.execute({ sql: `update "note" set ${set} where "id" = $id`, args: { id } });
}

describe('createNote', () => {
  test('stores the note with its JSON content and timestamps', async () => {
    const db = await createTestDb();
    const user = await createTestUser(db);
    const before = Date.now();

    const { id } = await createNote(db, user.id, { title: 'Groceries', content });

    const { rows } = await db.execute({
      sql: `select * from "note" where "id" = $id`,
      args: { id },
    });
    const row = rows[0];
    expect(row.userId).toBe(user.id);
    expect(row.title).toBe('Groceries');
    expect(JSON.parse(row.content as string)).toEqual(content);
    expect(row.shareToken).toBeNull();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(row.createdAt as number).toBeGreaterThanOrEqual(before);
  });

  test('can share the note right away', async () => {
    const db = await createTestDb();
    const user = await createTestUser(db);

    const { id } = await createNote(db, user.id, { title: 'Shared', content }, { shared: true });

    const token = (await getNote(db, user.id, id))?.shareToken ?? '';
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await getSharedNote(db, token)).toMatchObject({ title: 'Shared' });
  });
});

describe('listNotes', () => {
  test("returns only the owner's notes, newest first, without content", async () => {
    const db = await createTestDb();
    const ada = await createTestUser(db, 'Ada');
    const bob = await createTestUser(db, 'Bob');
    const older = await createNote(db, ada.id, { title: 'Older', content });
    const newer = await createNote(db, ada.id, { title: 'Newer', content });
    await createNote(db, bob.id, { title: "Bob's note", content });
    await setNote(db, older.id, `"updatedAt" = 1`);

    const notes = await listNotes(db, ada.id);

    expect(notes.map((note) => note.id)).toEqual([newer.id, older.id]);
    expect(notes[0]).toEqual({
      id: newer.id,
      title: 'Newer',
      updatedAt: expect.any(Number),
      isShared: false,
    });
    expect(notes[0]).not.toHaveProperty('content');
  });

  test('marks notes with a share token as shared', async () => {
    const db = await createTestDb();
    const user = await createTestUser(db);
    const { id } = await createNote(db, user.id, { title: '', content });
    await setNote(db, id, `"shareToken" = 'token'`);

    expect((await listNotes(db, user.id))[0].isShared).toBe(true);
  });
});

const edited = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited' }] }],
};

async function setup() {
  const db = await createTestDb();
  const ada = await createTestUser(db, 'Ada');
  const bob = await createTestUser(db, 'Bob');
  const { id } = await createNote(db, ada.id, { title: 'Plan', content });
  // Pushes timestamps into the past, so later writes are visibly newer.
  await setNote(db, id, `"createdAt" = 1, "updatedAt" = 1`);
  return { db, ada, bob, id };
}

describe('getNote', () => {
  test("returns the owner's note with parsed content", async () => {
    const { db, ada, id } = await setup();
    expect(await getNote(db, ada.id, id)).toEqual({
      id,
      title: 'Plan',
      content,
      shareToken: null,
      createdAt: 1,
      updatedAt: 1,
    });
  });

  test("returns null for another user's note or an unknown id", async () => {
    const { db, ada, bob, id } = await setup();
    expect(await getNote(db, bob.id, id)).toBeNull();
    expect(await getNote(db, ada.id, 'no-such-note')).toBeNull();
  });
});

describe('updateNote', () => {
  test('saves title and content and bumps updatedAt but not createdAt', async () => {
    const { db, ada, id } = await setup();
    const result = await updateNote(db, ada.id, id, { title: 'New title', content: edited });

    const note = await getNote(db, ada.id, id);
    expect(result).toEqual({ updatedAt: note?.updatedAt ?? -1 });
    expect(note?.title).toBe('New title');
    expect(note?.content).toEqual(edited);
    expect(note?.updatedAt).toBeGreaterThan(1);
    expect(note?.createdAt).toBe(1);
  });

  test("returns null and changes nothing for another user's note", async () => {
    const { db, ada, bob, id } = await setup();
    expect(await updateNote(db, bob.id, id, { title: 'Hijacked', content: edited })).toBeNull();
    expect((await getNote(db, ada.id, id))?.title).toBe('Plan');
  });
});

describe('sharing', () => {
  test('enabling creates a token that resolves to the note without owner details', async () => {
    const { db, ada, id } = await setup();
    const token = await enableSharing(db, ada.id, id);

    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await getSharedNote(db, token ?? '')).toEqual({ title: 'Plan', content, updatedAt: 1 });
  });

  test('enabling twice keeps the same token', async () => {
    const { db, ada, id } = await setup();
    expect(await enableSharing(db, ada.id, id)).toBe(await enableSharing(db, ada.id, id));
  });

  test('disabling kills the link, and re-enabling creates a new one', async () => {
    const { db, ada, id } = await setup();
    const first = (await enableSharing(db, ada.id, id)) ?? '';

    expect(await disableSharing(db, ada.id, id)).toBe(true);
    expect(await getSharedNote(db, first)).toBeNull();

    const second = (await enableSharing(db, ada.id, id)) ?? '';
    expect(second).not.toBe(first);
    expect(await getSharedNote(db, second)).not.toBeNull();
    expect(await getSharedNote(db, first)).toBeNull();
  });

  test("sharing changes don't touch updatedAt", async () => {
    const { db, ada, id } = await setup();
    await enableSharing(db, ada.id, id);
    await disableSharing(db, ada.id, id);
    expect((await getNote(db, ada.id, id))?.updatedAt).toBe(1);
  });

  test("other users can't enable or disable sharing", async () => {
    const { db, ada, bob, id } = await setup();
    expect(await enableSharing(db, bob.id, id)).toBeNull();
    expect((await getNote(db, ada.id, id))?.shareToken).toBeNull();

    const token = (await enableSharing(db, ada.id, id)) ?? '';
    expect(await disableSharing(db, bob.id, id)).toBe(false);
    expect(await getSharedNote(db, token)).not.toBeNull();
  });

  test('unknown tokens resolve to nothing', async () => {
    const { db } = await setup();
    expect(await getSharedNote(db, 'a'.repeat(32))).toBeNull();
  });
});
