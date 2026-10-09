import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_URL = 'file:data/app.db';

// Opens a libSQL client: Turso Cloud in production (libsql://… plus a token),
// a local file in dev, ':memory:' in tests. Kept out of lib/db.ts (server-only)
// so scripts/migrate.ts can open the same database.
export function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || DEFAULT_URL;
  // SQLite creates the file but not its folder. The path is resolved first
  // because Bun's mkdirSync throws EEXIST for '.', e.g. with file:app.db.
  if (url.startsWith('file:')) {
    mkdirSync(dirname(resolve(url.slice('file:'.length))), { recursive: true });
  }
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
}
