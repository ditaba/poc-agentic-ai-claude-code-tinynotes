import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Run with `bun run test`. The script starts Vitest on the Bun runtime
// (`bun --bun`), because the data layer uses bun:sqlite. A plain `bun test`
// starts Bun's own test runner instead.
export default defineConfig({
  resolve: {
    // Resolves the @/* alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '.next/**'],
    alias: {
      // The real package throws unless it's imported from a React Server
      // Component. Next.js swaps in an empty module on the server; tests do too.
      'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
    },
    // Bun loads .env into process.env, so tests pin their own values. DB_PATH
    // makes lib/db.ts open an in-memory database: tests never touch data/app.db.
    env: {
      BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
      DB_PATH: ':memory:',
    },
    // Every test starts with fresh mocks, spies, env vars and globals.
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
