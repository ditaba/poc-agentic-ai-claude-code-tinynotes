# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

TinyNotes is a small demo notes app: email/password auth, rich-text notes with autosave, and revocable public share links. The repo is currently the stock `create-next-app` scaffold (Next.js 16.1.1, React 19.2.3, Tailwind 4). The app itself is not built yet.

**`SPEC.md` is the source of truth.** Read the relevant sections before implementing anything. It fixes routes, SQL schemas, function signatures, error codes, UI copy, styling classes and the milestone order (M0–M6, one PR each, §15). Prefer the simplest solution, and build nothing from its _Out of scope_ list (§2). That rules out a `/settings` route, password reset or any email, and dark mode (the theme is light-only with the aqua palette in §11). Don't add an ORM, query builder, validation library or UI kit, and pin the dependency versions in §4 exactly.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

## Commands

Bun is the only package manager, runtime, test runner and script runner (D11). Use `bun add` / `bun install`, never npm. `bun.lock` is the lockfile, and `package-lock.json` gets deleted in M0.

```bash
bun install
bun dev                       # runs migrations, then starts Next on the Bun runtime
bun run build
bun start
bun run lint                  # eslint flat config (next core-web-vitals + typescript)
bun test                      # all unit tests
bun test lib/autosave         # only test files whose path matches
bun test -t "enable twice"    # only tests whose name matches
bun run db:migrate            # apply pending migrations
```

Until M0 lands, `package.json` still has the scaffold scripts (`next dev` and so on) and no `test` or `db:migrate` scripts. M0 replaces them with the scripts in SPEC §12, which call `bun --bun next …`. The `--bun` flag is required because `bun:sqlite` only exists in the Bun runtime, and a plain `bun next dev` runs Next on Node.

Env (`.env`, copied from `.env.example`): `BETTER_AUTH_SECRET` (at least 32 chars), `BETTER_AUTH_URL` (`http://localhost:3000`, also the base URL for share links), and optionally `DB_PATH` (default `data/app.db`).

## Architecture (target, per SPEC)

- **`lib/db/`**: `index.ts` (`server-only`) opens one `bun:sqlite` `Database` per process, cached on `globalThis` so hot reloads reuse it, with WAL, `foreign_keys = ON` and `busy_timeout`. better-auth gets this same instance. `notes.ts` holds pure data-access functions that take `db` as their first argument, use bound parameters only, and scope every owner query with `"userId" = $userId`.
- **`app/notes/actions.ts`**: every mutation is a Server Action. There's no custom REST API, and auth goes through better-auth's `/api/auth/[...all]` handler plus `lib/auth-client.ts`. Each action is wrapped in `withAction`, which calls `unstable_rethrow` first so `redirect`/`notFound` keep working, then logs the error and converts it with `toActionError` from `lib/errors.ts`. Actions return `ActionResult<T>` (`ok` / `code` / `message`). When the session is missing they return `UNAUTHENTICATED` instead of redirecting, so autosave never loses content. `deleteNote` is the only action that redirects.
- **`lib/rich-text/extensions.ts`**: the one TipTap extension list, shared by the editor, the server-side validator (`validate.ts`) and the renderer (`render.ts`, `@tiptap/html`). It must not import React. Content is stored and sent only as TipTap JSON, and HTML is generated only on the server. `components/note-content.tsx` is the only place allowed to use `dangerouslySetInnerHTML`. Shared notes are served from the app's own origin, so this is the XSS boundary: every write goes through `parseNoteContent` (schema check, link-protocol allowlist, 256 KiB limit).
- **`lib/autosave.ts`**: a framework-free autosave controller (1 s debounce, 5 s max wait, single-flight, retries at 2/5/10 s, behavior per error code). The editor wraps it in a thin `useAutosave` hook. Keep the logic in the controller so it stays unit-testable.
- **`migrations/NNNN_*.sql`**: forward-only, applied in filename order by `lib/db/migrate.ts` and tracked in the `_migration` table. Never edit a migration that has been applied; add a new one. `0001_better_auth.sql` is better-auth's schema. better-auth owns those tables, so app code touches them only through better-auth's APIs.

### Rules that span files

- **Every page and every Server Action checks auth itself**: pages call `requireUser()`, actions call `getCurrentUser()`. Layouts don't re-run on client-side navigation, and there is no `proxy.ts` or middleware.
- Missing notes, other users' notes and bad or disabled share tokens all call `notFound()`, which serves the same branded 404. **Never return 403.**
- Users only ever see curated messages. Never send `error.message`, stack traces or library errors to the client, and never log passwords, tokens or note content.
- Columns are camelCase, matching better-auth. `note.createdAt` / `updatedAt` are Unix epoch ms integers. Sharing changes don't bump `updatedAt`.
- Next 16: `params` is a Promise (`const { id } = await params`). Every page that reads the DB or the session is dynamic, so don't enable `cacheComponents` or add `generateStaticParams`. `/s/[token]` calls `await connection()` first.
- The TipTap editor is a `"use client"` component with `immediatelyRender: false`, which avoids hydration errors.

## Testing

Testing is unit tests only (`bun test`) plus the manual checklist in SPEC §14.2. There's no E2E suite. Tests sit next to the module they cover (`lib/**/*.test.ts`). **Tested modules must not import `"server-only"`, `next/*` or `lib/db/index.ts`**, which is why data access takes `db` as a parameter. Use `createTestDb()` / `createTestUser(db)` from `lib/db/test-utils.ts`, which give an in-memory DB with the real migrations applied. Autosave tests use short real delays (10–50 ms), not fake timers.

A milestone is done only when `bun run lint`, `bun test` and `bun run build` all pass.
