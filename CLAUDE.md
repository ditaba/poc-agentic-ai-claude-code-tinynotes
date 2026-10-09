# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

TinyNotes is a small demo notes app: email/password auth, rich-text notes with autosave, and revocable public share links. It's built on Next.js 16.1.1, React 19.2.3 and Tailwind 4, and deploys to Vercel with its database on Turso Cloud (M7).

**`SPEC.md` is the source of truth.** Read the relevant sections before implementing anything. It fixes routes, SQL schemas, function signatures, error codes, UI copy, styling classes and the milestone order (M0–M7, one PR each, §15). Prefer the simplest solution, and build nothing from its _Out of scope_ list (§2). That rules out a `/settings` route, password reset or any email, and dark mode (the theme is light-only with the aqua palette in §11). Don't add an ORM, query builder, validation library or UI kit, and pin the dependency versions in §4 exactly.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

## Commands

Bun is the only package manager and script runner (D11). Use `bun add` / `bun install`, never npm. `bun.lock` is the lockfile. Next.js and Vitest run on Node.js, locally and on Vercel: nothing needs the Bun runtime.

```bash
bun install
bun dev                       # applies the schema, then starts Next
bun run build
bun start
bun run lint                  # eslint flat config (next core-web-vitals + typescript)
bun run test                  # all unit tests (Vitest)
bun run test lib/notes        # only test files whose path matches
bun run test -t "sharing > enabling twice"   # only tests whose full name (describe > test) matches
bun run test:watch            # watch mode
bun run db:migrate            # create any missing tables in the database at TURSO_DATABASE_URL
```

Always `bun run test`, never `bun test`: the latter starts Bun's own runner, which ignores `vitest.config.mts`, so `bunfig.toml` stops it with a hint.

`dev` and `build` run `db:migrate` first, so every Vercel deploy prepares the Turso database before Next builds.

Env (`.env`, copied from `.env.example`): `BETTER_AUTH_SECRET` (at least 32 chars), `BETTER_AUTH_URL` (`http://localhost:3000`, also the base URL for share links), `TURSO_DATABASE_URL` (default `file:data/app.db`; `libsql://…` on Vercel) and `TURSO_AUTH_TOKEN` (empty for a local file). On Vercel, the Turso integration sets the last two, and every variable must be scoped to Production (and Preview if used).

## Architecture (per SPEC)

- **Database (`lib/db.ts`, `lib/db-client.ts`, `lib/notes.ts`)**: `lib/db.ts` (`server-only`) opens one `@libsql/client` `Client` per process via `createDbClient()`, cached on `globalThis` so hot reloads reuse it. better-auth gets this same client through `@libsql/kysely-libsql`'s `LibsqlDialect`. `notes.ts` holds pure async data-access functions that take `db` as their first argument, use bound parameters only (`db.execute({ sql, args })`), and scope every owner query with `"userId" = $userId`. Prefer a single statement over an interactive transaction: on Turso, a transaction holds the write lock for up to 5 s.
- **`app/notes/actions.ts`**: every mutation is a Server Action. There's no custom REST API, and auth goes through better-auth's `/api/auth/[...all]` handler plus `lib/auth-client.ts`. Each action is wrapped in `withAction`, which calls `unstable_rethrow` first so `redirect`/`notFound` keep working, then logs the error and converts it with `toActionError` from `lib/errors.ts`. Actions return `ActionResult<T>` (`ok` / `code` / `message`). When the session is missing they return `UNAUTHENTICATED` instead of redirecting, so autosave never loses content. `deleteNote` is the only action that redirects.
- **`lib/rich-text/extensions.ts`**: the one TipTap extension list, shared by the editor, the server-side validator (`validate.ts`) and the renderer (`render.ts`, `@tiptap/html`). It must not import React. Content is stored and sent only as TipTap JSON, and HTML is generated only on the server. `components/note-content.tsx` is the only place allowed to use `dangerouslySetInnerHTML`. Shared notes are served from the app's own origin, so this is the XSS boundary: every write goes through `parseNoteContent` (schema check, link-protocol allowlist, 256 KiB limit).
- **`lib/autosave.ts`**: a framework-free autosave controller (1 s debounce, 5 s max wait, single-flight, retries at 2/5/10 s, behavior per error code). The editor wraps it in a thin `useAutosave` hook. Keep the logic in the controller so it stays unit-testable.
- **`lib/db-schema.ts`**: the whole schema as idempotent `create … if not exists` statements, applied by `bun run db:migrate` (`scripts/migrate.ts`), never at request time. Keep changes additive. The `user`, `session`, `account` and `verification` tables are better-auth's schema. better-auth owns them, so app code touches them only through better-auth's APIs.

### Rules that span files

- **Every page and every Server Action checks auth itself**: pages call `requireUser()`, actions call `getCurrentUser()`. Layouts don't re-run on client-side navigation, and there is no `proxy.ts` or middleware.
- Missing notes, other users' notes and bad or disabled share tokens all call `notFound()`, which serves the same branded 404. **Never return 403.**
- Users only ever see curated messages. Never send `error.message`, stack traces or library errors to the client, and never log passwords, tokens or note content.
- Columns are camelCase, matching better-auth. `note.createdAt` / `updatedAt` are Unix epoch ms integers. Sharing changes don't bump `updatedAt`.
- Next 16: `params` is a Promise (`const { id } = await params`). Every page that reads the DB or the session is dynamic, so don't enable `cacheComponents` or add `generateStaticParams`. `/s/[token]` calls `await connection()` first.
- The TipTap editor is a `"use client"` component with `immediatelyRender: false`, which avoids hydration errors.

## Testing

Testing is unit tests on Vitest 5 (`bun run test`, config in `vitest.config.mts`) plus the manual checklist in SPEC §14.2. There's no E2E suite and no DOM: tests use the default `node` environment. Tests sit next to the module they cover (`*.test.ts(x)` in `app/`, `components/` and `lib/`), and shared helpers live in `test/`.

- **Runtime and config:** Vitest runs on Node, like the app. The config aliases `server-only` to an empty module, resolves `@/*` with `resolve.tsconfigPaths`, and pins env vars because `bun run` loads `.env`. `TURSO_DATABASE_URL=:memory:` makes `@/lib/db` an in-memory database, so tests never touch `data/app.db` or Turso, and `test/setup-db.ts` applies the schema to it before each test file. `BETTER_AUTH_URL` is `http://localhost:3000`. Mocks, spies, env stubs and globals are reset before every test.
- **Data layer:** use `await createTestDb()` / `await createTestUser(db)` from `test/db.ts` (a fresh in-memory DB with the real schema). Data access keeps taking `db` as a parameter, and every call is awaited. To simulate a DB failure, use `vi.spyOn(db, 'execute').mockRejectedValue(…)`.
- **Windows:** libsql keeps a closed file database locked until it's garbage-collected, so tests that open files must tolerate `EBUSY` when cleaning up (see `lib/db.test.ts`).
- **Server Actions and pages:** import them directly and use the shared `db` from `@/lib/db`.
  - Mock `next/headers` (`headers: async () => new Headers()`) and, as needed, `next/cache` and `next/server`'s `connection`.
  - Use `vi.mock('next/navigation', { spy: true })`: the real `redirect()` / `notFound()` still throw (`NEXT_REDIRECT`, `NEXT_HTTP_ERROR_FALLBACK;404`), and calls are tracked.
  - `signInAs(user | null)` from `test/session.ts` sets who is signed in.
  - `pageProps()` and `renderPage()` from `test/next.ts` call an async page and render it to HTML. Pages whose client components call `useRouter` need it mocked.
- **Auth:** `lib/auth.test.ts` runs the real better-auth config against the in-memory DB, so error codes are better-auth's own.
- **Client components** stay thin. Their logic lives in plain modules (`components/save-note.ts`, `components/sharing.ts`, `lib/auth-requests.ts`, `lib/rich-text/link-prompt.ts`), tested with the Server Actions or `authClient` mocked via `vi.mock`.
- **Vitest 5 rules:** `vi.mock` must be at the top level. `-t` matches the full `describe > test` name.
- Autosave tests use short real delays (10–50 ms), not fake timers.

A milestone is done only when `bun run lint`, `bun run test` and `bun run build` all pass.
