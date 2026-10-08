import type { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// lib/db.ts opens the database when it's first imported and caches it on
// globalThis, so each test clears the cache and imports a fresh copy.
const globalForDb = globalThis as typeof globalThis & { db?: Database };

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nextnotes-db-'));
  delete globalForDb.db;
  vi.resetModules();
});

afterEach(() => {
  globalForDb.db?.close();
  delete globalForDb.db;
  rmSync(dir, { recursive: true, force: true });
});

async function openDb(path: string): Promise<Database> {
  vi.stubEnv('DB_PATH', path);
  return (await import('@/lib/db')).db;
}

const pragma = (db: Database, name: string) =>
  Object.values(db.query(`pragma ${name}`).get() ?? {})[0];

describe('db', () => {
  test('creates the database file and its folder at DB_PATH', async () => {
    const path = join(dir, 'nested', 'app.db');
    await openDb(path);
    expect(existsSync(path)).toBe(true);
  });

  test('accepts a file in the working directory', async () => {
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await openDb('app.db');
      expect(existsSync(join(dir, 'app.db'))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  test('opens an in-memory database for :memory:', async () => {
    const db = await openDb(':memory:');
    expect(pragma(db, 'journal_mode')).toBe('memory');
    expect(pragma(db, 'foreign_keys')).toBe(1);
  });

  test('uses WAL mode, enforces foreign keys and waits for locks', async () => {
    const db = await openDb(join(dir, 'app.db'));
    expect(pragma(db, 'journal_mode')).toBe('wal');
    expect(pragma(db, 'foreign_keys')).toBe(1);
    expect(pragma(db, 'busy_timeout')).toBe(5000);
  });

  test('creates all tables', async () => {
    const db = await openDb(join(dir, 'app.db'));
    const tables = db
      .query<{ name: string }, []>(`select "name" from sqlite_master where "type" = 'table'`)
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(
      expect.arrayContaining(['user', 'session', 'account', 'verification', 'note']),
    );
  });

  test('keeps existing data when the schema is applied again on the next start', async () => {
    const path = join(dir, 'app.db');
    const first = await openDb(path);
    first.run(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ('u1', 'Ada', 'ada@example.com', 0, 'now', 'now')`,
    );
    first.close();
    delete globalForDb.db;
    vi.resetModules();

    const second = await openDb(path);
    expect(second.query(`select "name" from "user"`).all()).toEqual([{ name: 'Ada' }]);
  });

  test('reuses one connection across reloads, as in dev hot reloads', async () => {
    const first = await openDb(join(dir, 'app.db'));
    vi.resetModules();
    expect(await openDb(join(dir, 'other.db'))).toBe(first);
  });

  test('deleting a user deletes their notes and sessions', async () => {
    const db = await openDb(join(dir, 'app.db'));
    db.run(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ('u1', 'Ada', 'ada@example.com', 0, 'now', 'now')`,
    );
    db.run(
      `insert into "note" ("id", "userId", "content", "createdAt", "updatedAt")
       values ('n1', 'u1', '{"type":"doc"}', 1, 1)`,
    );
    db.run(
      `insert into "session" ("id", "userId", "token", "expiresAt", "createdAt", "updatedAt")
       values ('s1', 'u1', 't1', 'later', 'now', 'now')`,
    );

    db.run(`delete from "user" where "id" = 'u1'`);

    expect(db.query(`select count(*) as "count" from "note"`).get()).toEqual({ count: 0 });
    expect(db.query(`select count(*) as "count" from "session"`).get()).toEqual({ count: 0 });
  });

  test('only stores valid JSON as note content', async () => {
    const db = await openDb(join(dir, 'app.db'));
    db.run(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ('u1', 'Ada', 'ada@example.com', 0, 'now', 'now')`,
    );
    expect(() =>
      db.run(
        `insert into "note" ("id", "userId", "content", "createdAt", "updatedAt")
         values ('n1', 'u1', '{not json', 1, 1)`,
      ),
    ).toThrow('CHECK constraint failed');
  });
});
