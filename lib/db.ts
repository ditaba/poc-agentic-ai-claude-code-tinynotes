import 'server-only';
import type { Client } from '@libsql/client';
import { createDbClient } from '@/lib/db-client';

// The schema is applied by `bun run db:migrate` (run by the dev and build
// scripts), not here, so requests never run DDL.

// Cached on globalThis so dev hot reloads reuse one client.
const globalForDb = globalThis as typeof globalThis & { db?: Client };

export const db = (globalForDb.db ??= createDbClient());
