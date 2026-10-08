import { describe, expect, test } from "bun:test";
import { createNote, listNotes } from "./notes";
import { createTestDb, createTestUser } from "./test-utils";

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] };

describe("createNote", () => {
  test("stores the note with its JSON content and timestamps", () => {
    const db = createTestDb();
    const user = createTestUser(db);
    const before = Date.now();

    const { id } = createNote(db, user.id, { title: "Groceries", content });

    const row = db.query(`select * from "note" where "id" = $id`).get({ id }) as Record<string, unknown>;
    expect(row.userId).toBe(user.id);
    expect(row.title).toBe("Groceries");
    expect(JSON.parse(row.content as string)).toEqual(content);
    expect(row.shareToken).toBeNull();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(row.createdAt as number).toBeGreaterThanOrEqual(before);
  });
});

describe("listNotes", () => {
  test("returns only the owner's notes, newest first, without content", () => {
    const db = createTestDb();
    const ada = createTestUser(db, "Ada");
    const bob = createTestUser(db, "Bob");
    const older = createNote(db, ada.id, { title: "Older", content });
    const newer = createNote(db, ada.id, { title: "Newer", content });
    createNote(db, bob.id, { title: "Bob's note", content });
    db.query(`update "note" set "updatedAt" = 1 where "id" = $id`).run({ id: older.id });

    const notes = listNotes(db, ada.id);

    expect(notes.map((note) => note.id)).toEqual([newer.id, older.id]);
    expect(notes[0]).toEqual({ id: newer.id, title: "Newer", updatedAt: expect.any(Number), isShared: false });
    expect(notes[0]).not.toHaveProperty("content");
  });

  test("marks notes with a share token as shared", () => {
    const db = createTestDb();
    const user = createTestUser(db);
    const { id } = createNote(db, user.id, { title: "", content });
    db.query(`update "note" set "shareToken" = 'token' where "id" = $id`).run({ id });

    expect(listNotes(db, user.id)[0].isShared).toBe(true);
  });
});
