// Runs before every test file (see vitest.config.mts). The app's shared
// in-memory database starts empty, because only `db:migrate` applies the schema.
import { db } from '@/lib/db';
import { applySchema } from '@/lib/db-schema';

await applySchema(db);
