import { createClient, type Client } from '@libsql/client';
import { applySchema } from '@/lib/db-schema';

// A fresh in-memory database with the same schema as the app's.
export async function createTestDb(): Promise<Client> {
  const db = createClient({ url: ':memory:' });
  await applySchema(db);
  return db;
}

// Tests may insert user rows directly; app code goes through better-auth.
export async function createTestUser(db: Client, name = 'Test User'): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
          values ($id, $name, $email, 0, $now, $now)`,
    args: { id, name, email: `${id}@example.com`, now },
  });
  return { id };
}
