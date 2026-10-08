import type { Database } from 'bun:sqlite';
import type { JSONContent } from '@tiptap/core';
import type { NoteInput } from '@/lib/note-input';
import { generateShareToken } from '@/lib/share-token';

// Pure data access: every function takes the database first, uses bound
// parameters only, and scopes owner queries by userId. Callers validate input.

export type NoteSummary = {
  id: string;
  title: string;
  updatedAt: number;
  isShared: boolean;
};

export type Note = {
  id: string;
  title: string;
  content: JSONContent;
  shareToken: string | null;
  createdAt: number;
  updatedAt: number;
};

// What the public page may show: no owner information (D6).
export type SharedNote = Pick<Note, 'title' | 'content' | 'updatedAt'>;

type WithJsonContent<T> = Omit<T, 'content'> & { content: string };

function parseContent<T extends { content: string }>(
  row: T,
): Omit<T, 'content'> & { content: JSONContent } {
  return { ...row, content: JSON.parse(row.content) };
}

export function createNote(
  db: Database,
  userId: string,
  { title, content }: NoteInput,
): { id: string } {
  const id = crypto.randomUUID();
  const now = Date.now();
  db.query(
    `insert into "note" ("id", "userId", "title", "content", "createdAt", "updatedAt")
     values ($id, $userId, $title, $content, $now, $now)`,
  ).run({ id, userId, title, content: JSON.stringify(content), now });
  return { id };
}

// Newest first, without content.
export function listNotes(db: Database, userId: string): NoteSummary[] {
  const rows = db
    .query<Omit<NoteSummary, 'isShared'> & { isShared: number }, { userId: string }>(
      `select "id", "title", "updatedAt", "shareToken" is not null as "isShared"
       from "note"
       where "userId" = $userId
       order by "updatedAt" desc, "createdAt" desc`,
    )
    .all({ userId });
  return rows.map((row) => ({ ...row, isShared: row.isShared === 1 }));
}

export function getNote(db: Database, userId: string, id: string): Note | null {
  const row = db
    .query<WithJsonContent<Note>, { id: string; userId: string }>(
      `select "id", "title", "content", "shareToken", "createdAt", "updatedAt"
       from "note"
       where "id" = $id and "userId" = $userId`,
    )
    .get({ id, userId });
  return row ? parseContent(row) : null;
}

// Bumps updatedAt (AS-7). Returns null if the note doesn't exist or isn't the user's.
export function updateNote(
  db: Database,
  userId: string,
  id: string,
  { title, content }: NoteInput,
): { updatedAt: number } | null {
  const updatedAt = Date.now();
  const { changes } = db
    .query(
      `update "note"
       set "title" = $title, "content" = $content, "updatedAt" = $updatedAt
       where "id" = $id and "userId" = $userId`,
    )
    .run({ title, content: JSON.stringify(content), updatedAt, id, userId });
  return changes > 0 ? { updatedAt } : null;
}

// Returns the note's share token, creating one only if it isn't shared yet, so
// repeated calls don't change the link (SHARE-2). Doesn't touch updatedAt (SHARE-4).
export function enableSharing(db: Database, userId: string, id: string): string | null {
  const row = db
    .query<{ shareToken: string }, { id: string; userId: string; token: string }>(
      `update "note"
       set "shareToken" = coalesce("shareToken", $token)
       where "id" = $id and "userId" = $userId
       returning "shareToken"`,
    )
    .get({ id, userId, token: generateShareToken() });
  return row?.shareToken ?? null;
}

// Revokes the link for good: turning sharing back on creates a new token (D3).
export function disableSharing(db: Database, userId: string, id: string): boolean {
  const { changes } = db
    .query(`update "note" set "shareToken" = null where "id" = $id and "userId" = $userId`)
    .run({ id, userId });
  return changes > 0;
}

export function getSharedNote(db: Database, token: string): SharedNote | null {
  const row = db
    .query<WithJsonContent<SharedNote>, { token: string }>(
      `select "title", "content", "updatedAt" from "note" where "shareToken" = $token`,
    )
    .get({ token });
  return row ? parseContent(row) : null;
}
