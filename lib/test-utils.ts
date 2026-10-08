import { Database } from 'bun:sqlite';
import { applySchema } from './db-schema';

// An in-memory database with the same pragmas and schema as lib/db.ts.
export function createTestDb(): Database {
  const db = new Database(':memory:', { strict: true });
  db.run('pragma foreign_keys = ON');
  applySchema(db);
  return db;
}

// Tests may insert user rows directly; app code goes through better-auth.
export function createTestUser(db: Database, name = 'Test User'): { id: string } {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.query(
    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     values ($id, $name, $email, 0, $now, $now)`,
  ).run({ id, name, email: `${id}@example.com`, now });
  return { id };
}
