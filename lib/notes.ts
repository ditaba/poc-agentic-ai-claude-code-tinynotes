import type { Database } from "bun:sqlite";
import type { NoteInput } from "@/lib/note-input";

// Pure data access: every function takes the database first, uses bound
// parameters only, and scopes owner queries by userId. Callers validate input.

export type NoteSummary = {
  id: string;
  title: string;
  updatedAt: number;
  isShared: boolean;
};

export function createNote(db: Database, userId: string, { title, content }: NoteInput): { id: string } {
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
    .query<Omit<NoteSummary, "isShared"> & { isShared: number }, { userId: string }>(
      `select "id", "title", "updatedAt", "shareToken" is not null as "isShared"
       from "note"
       where "userId" = $userId
       order by "updatedAt" desc, "createdAt" desc`,
    )
    .all({ userId });
  return rows.map((row) => ({ ...row, isShared: row.isShared === 1 }));
}
