import type { Client } from '@libsql/client';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// lib/db.ts opens the client when it's first imported and caches it on
// globalThis, so each test clears the cache and imports a fresh copy.
const globalForDb = globalThis as typeof globalThis & { db?: Client };

let dir: string;
let sharedDb: Client | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tinynotes-db-'));
  // The shared test database from setup-db.ts; restored after each test.
  sharedDb = globalForDb.db;
  delete globalForDb.db;
  vi.resetModules();
});

afterEach(() => {
  globalForDb.db?.close();
  globalForDb.db = sharedDb;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    // On Windows, libsql keeps the file locked until the closed connection is
    // garbage-collected. The folder is in the OS temp dir, so it can stay.
    if ((err as NodeJS.ErrnoException).code !== 'EBUSY') throw err;
  }
});

async function openDb(url: string | undefined): Promise<Client> {
  vi.stubEnv('TURSO_DATABASE_URL', url);
  const { db } = await import('@/lib/db');
  // The file only appears once the client runs its first statement.
  await db.execute('select 1');
  return db;
}

// file: URLs use forward slashes, also on Windows.
const fileUrl = (...parts: string[]) => `file:${join(dir, ...parts).replaceAll('\\', '/')}`;

describe('db', () => {
  test('opens the file at TURSO_DATABASE_URL and creates its folder', async () => {
    await openDb(fileUrl('nested', 'app.db'));
    expect(existsSync(join(dir, 'nested', 'app.db'))).toBe(true);
  });

  test('defaults to data/app.db in the working directory', async () => {
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await openDb(undefined);
      expect(existsSync(join(dir, 'data', 'app.db'))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  test('accepts a file in the working directory', async () => {
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await openDb('file:app.db');
      expect(existsSync(join(dir, 'app.db'))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  test('reuses one client across reloads, as in dev hot reloads', async () => {
    const first = await openDb(':memory:');
    vi.resetModules();
    expect(await openDb(fileUrl('other.db'))).toBe(first);
    expect(existsSync(join(dir, 'other.db'))).toBe(false);
  });
});
