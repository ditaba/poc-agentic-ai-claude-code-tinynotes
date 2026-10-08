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

describe('createNote', () => {
  test('stores the note with its JSON content and timestamps', () => {
    const db = createTestDb();
    const user = createTestUser(db);
    const before = Date.now();

    const { id } = createNote(db, user.id, { title: 'Groceries', content });

    const row = db.query(`select * from "note" where "id" = $id`).get({ id }) as Record<
      string,
      unknown
    >;
    expect(row.userId).toBe(user.id);
    expect(row.title).toBe('Groceries');
    expect(JSON.parse(row.content as string)).toEqual(content);
    expect(row.shareToken).toBeNull();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(row.createdAt as number).toBeGreaterThanOrEqual(before);
  });
});

describe('listNotes', () => {
  test("returns only the owner's notes, newest first, without content", () => {
    const db = createTestDb();
    const ada = createTestUser(db, 'Ada');
    const bob = createTestUser(db, 'Bob');
    const older = createNote(db, ada.id, { title: 'Older', content });
    const newer = createNote(db, ada.id, { title: 'Newer', content });
    createNote(db, bob.id, { title: "Bob's note", content });
    db.query(`update "note" set "updatedAt" = 1 where "id" = $id`).run({ id: older.id });

    const notes = listNotes(db, ada.id);

    expect(notes.map((note) => note.id)).toEqual([newer.id, older.id]);
    expect(notes[0]).toEqual({
      id: newer.id,
      title: 'Newer',
      updatedAt: expect.any(Number),
      isShared: false,
    });
    expect(notes[0]).not.toHaveProperty('content');
  });

  test('marks notes with a share token as shared', () => {
    const db = createTestDb();
    const user = createTestUser(db);
    const { id } = createNote(db, user.id, { title: '', content });
    db.query(`update "note" set "shareToken" = 'token' where "id" = $id`).run({ id });

    expect(listNotes(db, user.id)[0].isShared).toBe(true);
  });
});

const edited = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited' }] }],
};

function setup() {
  const db = createTestDb();
  const ada = createTestUser(db, 'Ada');
  const bob = createTestUser(db, 'Bob');
  const { id } = createNote(db, ada.id, { title: 'Plan', content });
  // Pushes timestamps into the past, so later writes are visibly newer.
  db.query(`update "note" set "createdAt" = 1, "updatedAt" = 1 where "id" = $id`).run({ id });
  return { db, ada, bob, id };
}

describe('getNote', () => {
  test("returns the owner's note with parsed content", () => {
    const { db, ada, id } = setup();
    expect(getNote(db, ada.id, id)).toEqual({
      id,
      title: 'Plan',
      content,
      shareToken: null,
      createdAt: 1,
      updatedAt: 1,
    });
  });

  test("returns null for another user's note or an unknown id", () => {
    const { db, ada, bob, id } = setup();
    expect(getNote(db, bob.id, id)).toBeNull();
    expect(getNote(db, ada.id, 'no-such-note')).toBeNull();
  });
});

describe('updateNote', () => {
  test('saves title and content and bumps updatedAt but not createdAt', () => {
    const { db, ada, id } = setup();
    const result = updateNote(db, ada.id, id, { title: 'New title', content: edited });

    const note = getNote(db, ada.id, id);
    expect(result).toEqual({ updatedAt: note?.updatedAt ?? -1 });
    expect(note?.title).toBe('New title');
    expect(note?.content).toEqual(edited);
    expect(note?.updatedAt).toBeGreaterThan(1);
    expect(note?.createdAt).toBe(1);
  });

  test("returns null and changes nothing for another user's note", () => {
    const { db, ada, bob, id } = setup();
    expect(updateNote(db, bob.id, id, { title: 'Hijacked', content: edited })).toBeNull();
    expect(getNote(db, ada.id, id)?.title).toBe('Plan');
  });
});

describe('sharing', () => {
  test('enabling creates a token that resolves to the note without owner details', () => {
    const { db, ada, id } = setup();
    const token = enableSharing(db, ada.id, id);

    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(getSharedNote(db, token ?? '')).toEqual({ title: 'Plan', content, updatedAt: 1 });
  });

  test('enabling twice keeps the same token', () => {
    const { db, ada, id } = setup();
    expect(enableSharing(db, ada.id, id)).toBe(enableSharing(db, ada.id, id));
  });

  test('disabling kills the link, and re-enabling creates a new one', () => {
    const { db, ada, id } = setup();
    const first = enableSharing(db, ada.id, id) ?? '';

    expect(disableSharing(db, ada.id, id)).toBe(true);
    expect(getSharedNote(db, first)).toBeNull();

    const second = enableSharing(db, ada.id, id) ?? '';
    expect(second).not.toBe(first);
    expect(getSharedNote(db, second)).not.toBeNull();
    expect(getSharedNote(db, first)).toBeNull();
  });

  test("sharing changes don't touch updatedAt", () => {
    const { db, ada, id } = setup();
    enableSharing(db, ada.id, id);
    disableSharing(db, ada.id, id);
    expect(getNote(db, ada.id, id)?.updatedAt).toBe(1);
  });

  test("other users can't enable or disable sharing", () => {
    const { db, ada, bob, id } = setup();
    expect(enableSharing(db, bob.id, id)).toBeNull();
    expect(getNote(db, ada.id, id)?.shareToken).toBeNull();

    const token = enableSharing(db, ada.id, id) ?? '';
    expect(disableSharing(db, bob.id, id)).toBe(false);
    expect(getSharedNote(db, token)).not.toBeNull();
  });

  test('unknown tokens resolve to nothing', () => {
    const { db } = setup();
    expect(getSharedNote(db, 'a'.repeat(32))).toBeNull();
  });
});
