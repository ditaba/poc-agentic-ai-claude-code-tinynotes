import 'server-only';
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { applySchema } from '@/lib/db-schema';

function openDatabase() {
  const path = process.env.DB_PATH ?? 'data/app.db';
  // ':memory:' (used by tests) has no folder. The path is resolved first because
  // Bun's mkdirSync throws EEXIST for '.', e.g. with DB_PATH=app.db.
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });

  const db = new Database(path, { create: true, strict: true });
  // busy_timeout goes first so switching to WAL waits for locks instead of failing.
  db.run('pragma busy_timeout = 5000');
  db.run('pragma journal_mode = WAL');
  // Applies per connection; needed for the cascading deletes.
  db.run('pragma foreign_keys = ON');

  applySchema(db);
  return db;
}

// Cached on globalThis so dev hot reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { db?: Database };

export const db = (globalForDb.db ??= openDatabase());
