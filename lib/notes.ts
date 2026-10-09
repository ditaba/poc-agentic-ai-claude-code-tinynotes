import type { Client, Row } from '@libsql/client';
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

// libSQL rows also expose their values by index. Spreading keeps only the
// named columns, as a plain object. The type is the query's column list.
function toObject<T>(row: Row): T {
  return { ...row } as T;
}

function parseContent<T extends { content: string }>(
  row: T,
): Omit<T, 'content'> & { content: JSONContent } {
  return { ...row, content: JSON.parse(row.content) };
}

// One INSERT, so a note is never left created but unshared when sharing is asked for.
export async function createNote(
  db: Client,
  userId: string,
  { title, content }: NoteInput,
  { shared = false }: { shared?: boolean } = {},
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `insert into "note" ("id", "userId", "title", "content", "shareToken", "createdAt", "updatedAt")
          values ($id, $userId, $title, $content, $shareToken, $now, $now)`,
    args: {
      id,
      userId,
      title,
      content: JSON.stringify(content),
      shareToken: shared ? generateShareToken() : null,
      now,
    },
  });
  return { id };
}

// Newest first, without content.
export async function listNotes(db: Client, userId: string): Promise<NoteSummary[]> {
  const { rows } = await db.execute({
    sql: `select "id", "title", "updatedAt", "shareToken" is not null as "isShared"
          from "note"
          where "userId" = $userId
          order by "updatedAt" desc, "createdAt" desc`,
    args: { userId },
  });
  return rows.map((row) => {
    const note = toObject<Omit<NoteSummary, 'isShared'> & { isShared: number }>(row);
    return { ...note, isShared: note.isShared === 1 };
  });
}

export async function getNote(db: Client, userId: string, id: string): Promise<Note | null> {
  const { rows } = await db.execute({
    sql: `select "id", "title", "content", "shareToken", "createdAt", "updatedAt"
          from "note"
          where "id" = $id and "userId" = $userId`,
    args: { id, userId },
  });
  return rows[0] ? parseContent(toObject<WithJsonContent<Note>>(rows[0])) : null;
}

// Bumps updatedAt (AS-7). Returns null if the note doesn't exist or isn't the user's.
export async function updateNote(
  db: Client,
  userId: string,
  id: string,
  { title, content }: NoteInput,
): Promise<{ updatedAt: number } | null> {
  const updatedAt = Date.now();
  const { rowsAffected } = await db.execute({
    sql: `update "note"
          set "title" = $title, "content" = $content, "updatedAt" = $updatedAt
          where "id" = $id and "userId" = $userId`,
    args: { title, content: JSON.stringify(content), updatedAt, id, userId },
  });
  return rowsAffected > 0 ? { updatedAt } : null;
}

// Returns the note's share token, creating one only if it isn't shared yet, so
// repeated calls don't change the link (SHARE-2). Doesn't touch updatedAt (SHARE-4).
export async function enableSharing(
  db: Client,
  userId: string,
  id: string,
): Promise<string | null> {
  const { rows } = await db.execute({
    sql: `update "note"
          set "shareToken" = coalesce("shareToken", $token)
          where "id" = $id and "userId" = $userId
          returning "shareToken"`,
    args: { id, userId, token: generateShareToken() },
  });
  return rows[0] ? toObject<{ shareToken: string }>(rows[0]).shareToken : null;
}

// Revokes the link for good: turning sharing back on creates a new token (D3).
export async function disableSharing(db: Client, userId: string, id: string): Promise<boolean> {
  const { rowsAffected } = await db.execute({
    sql: `update "note" set "shareToken" = null where "id" = $id and "userId" = $userId`,
    args: { id, userId },
  });
  return rowsAffected > 0;
}

export async function getSharedNote(db: Client, token: string): Promise<SharedNote | null> {
  const { rows } = await db.execute({
    sql: `select "title", "content", "updatedAt" from "note" where "shareToken" = $token`,
    args: { token },
  });
  return rows[0] ? parseContent(toObject<WithJsonContent<SharedNote>>(rows[0])) : null;
}
