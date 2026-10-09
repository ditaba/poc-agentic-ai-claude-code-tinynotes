import { createClient, type Client, type Transaction } from '@libsql/client';
import { describe, expect, test } from 'vitest';
import { applySchema } from './db-schema';
import { createTestDb } from '@/test/db';

const insertUser = (db: Pick<Transaction, 'execute'>) =>
  db.execute(
    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     values ('u1', 'Ada', 'ada@example.com', 0, 'now', 'now')`,
  );

async function count(db: Client, table: string) {
  const { rows } = await db.execute(`select count(*) as "count" from "${table}"`);
  return rows[0].count;
}

describe('applySchema', () => {
  test('creates all tables', async () => {
    const db = await createTestDb();
    const { rows } = await db.execute(`select "name" from sqlite_master where "type" = 'table'`);
    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(['user', 'session', 'account', 'verification', 'note']),
    );
  });

  test('keeps existing data when it runs again, as on every deploy', async () => {
    const db = await createTestDb();
    await insertUser(db);

    await applySchema(db);

    expect(await count(db, 'user')).toBe(1);
  });

  // libSQL enforces foreign keys by default, unlike plain SQLite.
  test('deleting a user deletes their notes and sessions', async () => {
    const db = await createTestDb();
    await insertUser(db);
    await db.execute(
      `insert into "note" ("id", "userId", "content", "createdAt", "updatedAt")
       values ('n1', 'u1', '{"type":"doc"}', 1, 1)`,
    );
    await db.execute(
      `insert into "session" ("id", "userId", "token", "expiresAt", "createdAt", "updatedAt")
       values ('s1', 'u1', 't1', 'later', 'now', 'now')`,
    );

    await db.execute(`delete from "user" where "id" = 'u1'`);

    expect(await count(db, 'note')).toBe(0);
    expect(await count(db, 'session')).toBe(0);
  });

  test('only stores valid JSON as note content', async () => {
    const db = await createTestDb();
    await insertUser(db);
    await expect(
      db.execute(
        `insert into "note" ("id", "userId", "content", "createdAt", "updatedAt")
         values ('n1', 'u1', '{not json', 1, 1)`,
      ),
    ).rejects.toThrow('CHECK constraint failed');
  });
});

// better-auth runs some queries in transactions. Before @libsql/client 0.18.0,
// a transaction on ':memory:' silently swapped in a new, empty database
// (libsql-client-ts#349), which would break every test using the shared db.
test('an in-memory database survives a transaction', async () => {
  const db = createClient({ url: ':memory:' });
  await applySchema(db);

  const transaction = await db.transaction('write');
  await insertUser(transaction);
  await transaction.commit();

  expect(await count(db, 'user')).toBe(1);
});
