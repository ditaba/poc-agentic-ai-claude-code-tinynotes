// `bun run db:migrate`: creates any missing tables. The dev and build scripts
// run it first, so a Vercel deploy prepares the Turso database before Next builds.
import { createDbClient } from '@/lib/db-client';
import { applySchema } from '@/lib/db-schema';

const db = createDbClient();
try {
  await applySchema(db);
  console.log('Database schema is up to date.');
} catch (err) {
  // The URL and token never reach the log, only the error.
  console.error('Applying the database schema failed:', err);
  process.exitCode = 1;
} finally {
  db.close();
}
