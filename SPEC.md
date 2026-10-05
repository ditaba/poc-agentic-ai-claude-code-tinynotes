# TinyNotes — Specification

**Version** 1.1 · 2026-10-05 · **Owner** Di Ta · **Status** Ready for implementation
Builds on the existing Next.js 16.1 / React 19.2 / Tailwind 4 scaffold in this repo.

## 1. Overview

TinyNotes is a deliberately simple demo app. Users sign up with email and password and write rich-text notes, which are saved automatically. They can publish any note through a public link that they can revoke; anyone with an active link can read the note without an account. Prefer the simplest solution, and don't build anything listed under *Out of scope*.

## 2. Scope

**In scope:**
- Email/password auth
- Create, view, edit (with autosave) and delete your own notes
- A public share link per note: enable, copy, disable
- A read-only public page for shared notes
- Safe error handling
- A branded 404 page

**Out of scope:**
- A **`/settings` route** or any settings, profile or account page
- Password reset, email verification, sending any email, OAuth, 2FA
- Account deletion
- Images, files or embeds in notes
- Real-time collaboration, conflict detection, version history
- Search, tags, folders, pagination
- Dark mode, i18n
- Deployment, analytics, custom rate limiting (better-auth's defaults are enough)

## 3. Decisions

| # | Decision |
|---|---|
| D1 | Notes have a separate plain-text **title**. An empty title is shown as "Untitled". |
| D2 | **Autosave**, debounced, with no Save button (§6.3). |
| D3 | Disabling sharing revokes the link permanently. Re-enabling always creates a **new** link. |
| D4 | Testing is `bun test` unit tests plus a manual acceptance checklist. No E2E suite. |
| D5 | Content is stored **only as TipTap JSON**. HTML is generated on the server and is never stored or accepted from the client. |
| D6 | The public page shows the title, content and last-updated date, but **not the author**. |
| D7 | Our tables use **camelCase** columns, like better-auth's tables, so rows map 1:1 to TS objects. |
| D8 | Mutations go through **Server Actions**. Auth goes through better-auth's route handler and client SDK. There's no custom REST API. |
| D9 | Notes are **hard-deleted** after a confirmation. |
| D10 | **Last write wins** when one note is open in two tabs. |
| D11 | **Bun only**, as package manager, runtime, test runner and script runner. Delete `package-lock.json`. |
| D12 | Light theme only, with the **aqua** palette in §11. |

## 4. Tech stack

| Concern | Choice | Version (pin exactly) |
|---|---|---|
| Runtime / package manager | Bun | ≥ 1.3 (verified on 1.3.12) |
| Framework | Next.js App Router, TypeScript `strict` | 16.1.1 (installed) |
| UI | React | 19.2.3 (installed) |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` | 4.x / 0.5.20 |
| Rich text | `@tiptap/react` `@tiptap/pm` `@tiptap/core` `@tiptap/starter-kit` `@tiptap/html` | 3.31.4 |
| Auth | `better-auth` (email + password) | 1.7.7 |
| Database | SQLite through the built-in `bun:sqlite`; raw parameterized SQL; custom migrations | — |

Don't add an ORM, query builder, validation library or UI kit.

> **Next.js must run on the Bun runtime.** `bun:sqlite` only exists inside Bun, and a plain `bun next dev` still runs Next.js on Node. All scripts therefore use `bun --bun next …` (§12). Next.js already treats `bun:*` imports as external ([vercel/next.js#77616](https://github.com/vercel/next.js/pull/77616)), so no bundler config is needed.

## 5. Routes

| Route | Access | Content |
|---|---|---|
| `/` | public | Intro with Sign in / Sign up. Signed-in users are redirected to `/notes`. |
| `/sign-up`, `/sign-in` | signed-out (signed-in users → `/notes`) | Auth forms |
| `/notes` | signed-in | Note list |
| `/notes/new` | signed-in | Empty editor. The note is created on the first autosave. |
| `/notes/[id]` | owner | Read-only view, share panel, Edit, Delete |
| `/notes/[id]/edit` | owner | Editor with autosave |
| `/s/[token]` | public | Shared note, read-only |
| `/api/auth/[...all]` | — | better-auth handler |
| anything else | — | 404 page (§7) |

- Signed-out users who open any `/notes…` route are redirected to `/sign-in`.
- **Every page and every Server Action checks auth itself.** Don't rely on layouts for this, because they don't re-run on client-side navigation. There's no `proxy.ts`.
- In Next 16, `params` is a Promise, so use `const { id } = await params`.

## 6. Functional requirements

### 6.1 Auth

- **AUTH-1 Sign up** with name, email and password. Name: 1–100 chars, trimmed. Email: valid and unique (better-auth stores it lowercased). Password: 8–128 chars. On success the user is signed in and redirected to `/notes`.
- **AUTH-2 Sign in** redirects to `/notes`. Any credential failure shows "Invalid email or password".
- **AUTH-3 Sign out** from the header, then redirect to `/`.
- **AUTH-4** Sessions keep better-auth's defaults: cookie-based, 7-day expiry, refreshed while in use. There's no email verification and no email is ever sent.

### 6.2 Notes

- **NOTE-1** `/notes` lists only the current user's notes, newest `updatedAt` first. Each row shows the title (or "Untitled"), the last-updated time, and a "Shared" badge when a link is active. With no notes, show an empty state with a "Create your first note" button.
- **NOTE-2 View page**: title, last updated, rendered content, **Edit**, **Delete**, and the share panel.
- **NOTE-3 Delete** asks *"Delete this note? This can't be undone, and its public link will stop working."* On confirm, the note is hard-deleted and the user goes to `/notes`.
- **NOTE-4** Another user's note id, or a nonexistent id, returns **404, never 403**.
- **NOTE-5 Limits**: title ≤ 200 chars after trimming; content ≤ 256 KiB as serialized JSON. The server enforces both.

### 6.3 Autosave (editor pages)

- **AS-1** Any change to the title or content schedules a save **1 s after the last change**. A save also runs **5 s** after the first unsaved change at the latest, so continuous typing still gets saved.
- **AS-2 Single-flight.** Only one save request runs at a time. Changes made while a save is running are sent right after it finishes, using only the latest state, so saves never arrive out of order.
- **AS-3 Flush immediately** in these cases:
  - Ctrl/Cmd+S (also prevent the browser's save dialog)
  - The tab becomes hidden (`visibilitychange`)
  - The in-page **Done** link is clicked (navigate once the flush succeeds)
  - The editor unmounts during in-app navigation (fire-and-forget)
- **AS-4 Status indicator**: "Saved", "Unsaved changes", "Saving…", or an error message (AS-5). `beforeunload` warns while anything is unsaved, saving or failed.
- **AS-5 Failures never discard local content.** Behavior per error code (§7):

  | Error | Behavior |
  |---|---|
  | Network error / `INTERNAL` | Retry automatically after 2 s, 5 s and 10 s. Then show "Couldn't save your changes" with a **Retry** button. The next edit also retries. |
  | `VALIDATION` | Show the message, e.g. "This note is too large to save". Retry only on the next edit. |
  | `NOT_FOUND` | Stop autosaving. Show "This note no longer exists" with a link to `/notes`. |
  | `UNAUTHENTICATED` | Stop autosaving. Show "You've been signed out" with a `/sign-in` link that opens in a new tab, then **Retry**. |

- **AS-6 New notes.** `/notes/new` stores nothing until the first change. The first save calls `createNote`, then `window.history.replaceState(null, "", \`/notes/${id}/edit\`)`. This changes the URL without remounting the editor, so the cursor stays put. Later saves call `updateNote`. Leaving an untouched `/notes/new` creates no note.
- **AS-7** Every save updates `updatedAt`. Share links always show the latest saved version.

### 6.4 Editor

- **EDIT-1** TipTap v3 with StarterKit. Toolbar buttons, each showing its active state: Bold, Italic, Underline, Strike, Inline code, H1–H3, Bullet list, Numbered list, Blockquote, Code block, Horizontal rule, Link (add/edit/remove via `window.prompt`), Undo, Redo.
- **EDIT-2 Links** allow only `http:`, `https:` and `mailto:`. A URL without a protocol gets `https://`. Links aren't clickable inside the editor. Rendered links use `target="_blank" rel="noopener noreferrer nofollow"`.
- **EDIT-3** No images, tables, embeds, colors or file drops. Pasted HTML is reduced to the schema automatically.
- **EDIT-4** The editor and the rendered view share the same `prose` styling, so the editor looks exactly like the published note.

### 6.5 Sharing

- **SHARE-1 Share panel** on the view page. When off: a short explanation and a **Create public link** button. When on: a read-only URL field, a **Copy** button (shows "Copied"), and a **Disable link** button.
- **SHARE-2 Enable** generates a new token. If the note is already shared, it returns the existing token, so repeated clicks don't rotate it.
- **SHARE-3 Disable** asks *"Anyone using this link will lose access. Turning sharing back on creates a new link."* It then sets the token to `NULL`, effective from the next request.
- **SHARE-4** Deleting a note kills its link. Sharing changes don't touch `updatedAt`.
- **SHARE-5** URL format: `${BETTER_AUTH_URL}/s/${token}`.

### 6.6 Public page `/s/[token]`

- **PUB-1** No sign-in needed. Shows the title (or "Untitled"), "Last updated <date>" and the content. The header is minimal: "TinyNotes" plus "Create your own notes" linking to `/sign-up`. There are no edit controls and no author, even for the owner.
- **PUB-2** Malformed, unknown and disabled tokens all get the same 404.
- **PUB-3** The page renders on every request, with no static generation and no caching.
- **PUB-4 Metadata**: `<title>` is the note title, `robots: { index: false, follow: false }`, and `referrer: "no-referrer"`.

## 7. Error handling & 404

**Users only ever see curated messages.** Never send `error.message`, stack traces, SQL, file paths or library errors to the client. Full details go to the server logs only.

- **ERR-1 Action results.** Every Server Action returns this type:
  ```ts
  type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; code: "VALIDATION" | "NOT_FOUND" | "UNAUTHENTICATED" | "INTERNAL"; message: string };
  ```
  When the session is missing, actions return `UNAUTHENTICATED` instead of redirecting, so autosave keeps the user's content. The one exception is `deleteNote`, which redirects to `/notes` on success.
- **ERR-2 `lib/errors.ts`** defines:
  - `AppError extends Error`, with a `code` and a message that is safe to show users.
  - `toActionError(err)`. An `AppError` keeps its code and message. Anything else becomes `{ code: "INTERNAL", message: "Something went wrong. Please try again." }`.

  `app/notes/actions.ts` wraps every action in `withAction(name, fn)`. The wrapper calls `unstable_rethrow(err)` first, so Next's `redirect`/`notFound` keep working. It then logs unexpected errors and returns `toActionError(err)`.
- **ERR-3 Logging.** Use server-side `console.error` with context (action or route, `userId`, `noteId`) and the original error. Never log passwords, session tokens, share tokens or note content.
- **ERR-4 Page errors.**
  - Missing notes, other users' notes and bad share tokens call `notFound()`.
  - Unexpected errors land in `app/error.tsx`, a client error boundary. It shows "Something went wrong", a **Try again** button (`reset()`), a link to `/notes`, and the error `digest` as a reference ID. It never shows `error.message`.
  - `app/global-error.tsx` covers failures in the root layout and renders its own `<html>`/`<body>`.
- **ERR-5 404.** `app/not-found.tsx` is a branded page: *"Page not found. This page doesn't exist or is no longer available."*, plus a link home. It's served with HTTP 404 for unknown URLs, missing or foreign notes, and invalid or disabled share links. It looks identical in every case.
- **ERR-6 Auth forms** map known better-auth error codes to fixed messages: invalid credentials, email already registered, password length. Any other error shows the generic message. Never render better-auth's raw message.
- **ERR-7** Forms validate on the client for instant feedback, but the server re-validates and has the final say.

## 8. Database

### 8.1 Connection — `lib/db/index.ts` (`import "server-only"`)

- Open one `Database` per process: `new Database(process.env.DB_PATH ?? "data/app.db", { create: true, strict: true })`. Cache it on `globalThis` so dev hot reloads don't open extra connections, and create the parent directory if it's missing.
- Run these PRAGMAs on open: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`. `foreign_keys` applies per connection and is needed for the cascading deletes.
- Pass this same instance to better-auth.

### 8.2 Migrations

- Files are named `migrations/NNNN_description.sql` and applied in filename order. Migrations are forward-only: never edit a file that has already been applied.
- `lib/db/migrate.ts` exports `runMigrations(db, dir): string[]`, which returns the names of the files it applied. The CLI is `scripts/migrate.ts` (`bun run db:migrate`), and the `dev`/`start` scripts run it automatically.
- Applied files are tracked in this table:
  ```sql
  create table if not exists "_migration" ("name" text not null primary key, "appliedAt" integer not null);
  ```
- Each pending file runs in its own `db.transaction` together with its `_migration` insert. `db.exec(sql)` runs every statement in a file (verified on Bun 1.3). If a file fails, the runner rolls it back, logs the file name and error, and exits non-zero.

### 8.3 `0001_better_auth.sql` — better-auth core schema

These tables follow the official better-auth schema. Types are mapped the way the Better Auth CLI does for SQLite: string → `text`, boolean → `integer`, Date → `date`. **better-auth owns these tables**: app code only touches them through better-auth's APIs, though tests may insert `user` rows directly. Don't change them by hand. When upgrading better-auth, regenerate the schema with the CLI (`npx auth@latest generate`), diff it against this file, and put any change in a new migration.

```sql
create table "user" (
  "id"            text    not null primary key,
  "name"          text    not null,
  "email"         text    not null unique,
  "emailVerified" integer not null,
  "image"         text,
  "createdAt"     date    not null,
  "updatedAt"     date    not null
);

create table "session" (
  "id"        text not null primary key,
  "userId"    text not null references "user" ("id") on delete cascade,
  "token"     text not null unique,
  "expiresAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "account" (
  "id"                    text not null primary key,
  "userId"                text not null references "user" ("id") on delete cascade,
  "accountId"             text not null,
  "providerId"            text not null,
  "accessToken"           text,
  "refreshToken"          text,
  "accessTokenExpiresAt"  date,
  "refreshTokenExpiresAt" date,
  "scope"                 text,
  "idToken"               text,
  "password"              text,
  "createdAt"             date not null,
  "updatedAt"             date not null
);

create table "verification" (
  "id"         text not null primary key,
  "identifier" text not null,
  "value"      text not null,
  "expiresAt"  date not null,
  "createdAt"  date not null,
  "updatedAt"  date not null
);

create index "session_userId_idx"          on "session" ("userId");
create index "account_userId_idx"          on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
```

### 8.4 `0002_note.sql`

```sql
create table "note" (
  "id"         text    not null primary key,                               -- crypto.randomUUID()
  "userId"     text    not null references "user" ("id") on delete cascade,
  "title"      text    not null default '',                                -- '' => "Untitled"
  "content"    text    not null check (json_valid("content")),             -- TipTap JSON doc
  "shareToken" text    unique,                                             -- NULL = not shared
  "createdAt"  integer not null,                                           -- Unix epoch ms
  "updatedAt"  integer not null                                            -- Unix epoch ms
);

create index "note_userId_updatedAt_idx" on "note" ("userId", "updatedAt" desc);
```

A note is shared exactly when `shareToken IS NOT NULL`. SQLite's `UNIQUE` allows many `NULL`s.

## 9. Server & client design

### 9.1 Data access — `lib/db/notes.ts`

These are pure functions that take `db` as the first argument and use bound parameters only. **Every owner query includes `"userId" = $userId` in its `WHERE` clause.** Content is `JSON.stringify`'d on write and parsed on read. Callers validate the input.

```ts
listNotes(db, userId): { id; title; updatedAt; isShared }[]            // no content
getNote(db, userId, id): Note | null
createNote(db, userId, { title, content }): Note
updateNote(db, userId, id, { title, content }): Note | null            // bumps updatedAt
deleteNote(db, userId, id): boolean
enableSharing(db, userId, id): string | null                           // existing token if already shared
disableSharing(db, userId, id): boolean
getSharedNote(db, token): { title; content; updatedAt } | null
```

### 9.2 Share tokens — `lib/share-token.ts`

Tokens are 24 random bytes from `crypto.getRandomValues`, encoded as base64url: 32 chars and 192 bits. The public page checks `isWellFormedShareToken` (`/^[A-Za-z0-9_-]{32}$/`) before querying the DB.

### 9.3 Rich text — `lib/rich-text/`

**`extensions.ts`** holds the single extension list. The editor, validator and renderer all use it, so it must not import React.

```ts
const ALLOWED = ["http:", "https:", "mailto:"];
export const isAllowedHref = (href: string) => {
  try { return ALLOWED.includes(new URL(href).protocol); } catch { return false; }
};
export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isAllowedHref(url),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
];
```

**`validate.ts`**: `parseNoteContent(input: unknown)` rejects the content unless all of these hold:
- It's a plain object with `type: "doc"`.
- Its serialized size is ≤ 256 KiB.
- `getSchema(noteExtensions).nodeFromJSON(doc).check()` passes. This throws on unknown nodes or marks and on invalid structure.
- Every link `href` passes `isAllowedHref`.

**`render.ts`**: `renderNoteHtml(doc)` is `generateHTML(doc, noteExtensions)` from `@tiptap/html`.

**`components/note-content.tsx`** is the **only** place that uses `dangerouslySetInnerHTML`, and only with `renderNoteHtml` output.

**Editor.** A `"use client"` component using `useEditor({ extensions: noteExtensions, immediatelyRender: false })`. It sends `editor.getJSON()`, never HTML. A new note starts as `{"type":"doc","content":[{"type":"paragraph"}]}`.

### 9.4 Autosave controller — `lib/autosave.ts`

This is a framework-free, unit-tested implementation of AS-1 to AS-5:

```ts
createAutosaver<S>({ save: (s: S) => Promise<ActionResult<unknown>>, onStatus,
                     debounceMs = 1000, maxWaitMs = 5000, retryDelaysMs = [2000, 5000, 10000] })
  → { change(snapshot: S): void; flush(): Promise<void>; dispose(): void }
```

The editor wraps it in a thin `useAutosave` hook. On `/notes/new`, the `save` callback switches from `createNote` to `updateNote` once the note has an id (AS-6).

### 9.5 Auth wiring

```ts
// lib/auth.ts  (server-only)
export const auth = betterAuth({
  database: db, // bun:sqlite instance from lib/db
  emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8, maxPasswordLength: 128 },
}); // secret + baseURL are read from BETTER_AUTH_SECRET / BETTER_AUTH_URL

// app/api/auth/[...all]/route.ts
export const { GET, POST } = toNextJsHandler(auth);          // from "better-auth/next-js"

// lib/auth-client.ts — used by the auth forms and the sign-out button
export const authClient = createAuthClient();                // from "better-auth/react"

// lib/session.ts  (server-only)
export const getCurrentUser = cache(async () =>
  (await auth.api.getSession({ headers: await headers() }))?.user ?? null);
export async function requireUser() {                       // pages only; actions use getCurrentUser
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
```

### 9.6 Server Actions — `app/notes/actions.ts`

Every action runs these steps in order:
1. The `withAction` wrapper (ERR-2).
2. `getCurrentUser()`; return `UNAUTHENTICATED` if there's no user.
3. Validate all inputs, which arrive typed `unknown`: the NOTE-5 limits, `parseNoteContent`, and checking that ids are strings.
4. Call the data layer with `user.id`. A `null`/`false` result returns `NOT_FOUND`.
5. Call `revalidatePath` for the affected routes.

| Action | Input | Success |
|---|---|---|
| `createNote` | `{ title, content }` | `{ id }` |
| `updateNote` | `id, { title, content }` | `{ updatedAt }` |
| `deleteNote` | `id` | `redirect("/notes")` |
| `enableSharing` | `id` | `{ shareUrl }` |
| `disableSharing` | `id` | `{}` |

### 9.7 Rendering

Every page that reads the DB or the session is dynamic. Don't enable `cacheComponents`, and don't add `generateStaticParams`. `/s/[token]` calls `await connection()` first.

## 10. Security

| ID | Requirement |
|---|---|
| SEC-1 | **Authorization.** Every owner page and every action checks the session and scopes its SQL by `userId`. Non-owners get 404. |
| SEC-2 | **SQL.** Bound parameters only. Never interpolate values into SQL strings. |
| SEC-3 | **XSS.** Shared notes are served from the same origin as the app, so this is critical. Only JSON is accepted and stored. Every write is validated against the schema and the link-protocol allowlist, and HTML is generated in exactly one place (§9.3). |
| SEC-4 | **Share links.** Tokens carry 192 bits of randomness. Every failure case gets the same 404. The page sets `noindex` and `no-referrer`. |
| SEC-5 | **Secrets.** `BETTER_AUTH_SECRET` is ≥ 32 random chars and comes from the environment only. `.env` is never committed. |
| SEC-6 | **CSRF.** Rely on the Origin check built into Server Actions and on better-auth's origin checks. Never mutate state in a GET handler. |
| SEC-7 | **Error leakage.** Follow §7. No internal details reach the client, and logs exclude secrets and note content. |

## 11. Styling — elegant aqua

Define the palette in `app/globals.css` with Tailwind v4 `@theme`. This generates `bg-aqua-*`, `text-aqua-*` and so on. Also add `@plugin "@tailwindcss/typography";` there.

```css
@theme {
  --color-aqua-50:  #effcfc;  --color-aqua-100: #d5f5f6;  --color-aqua-200: #b0eaee;
  --color-aqua-300: #79d9e0;  --color-aqua-400: #3cbfca;  --color-aqua-500: #20a3b0;
  --color-aqua-600: #1c8494;  --color-aqua-700: #1d6a78;  --color-aqua-800: #1f5763;
  --color-aqua-900: #1e4954;  --color-aqua-950: #0e2f38;
}
```

| Element | Classes |
|---|---|
| Page background | `bg-aqua-50`; the landing hero uses a soft `from-aqua-100 to-white` gradient |
| Cards / surfaces | `bg-white border border-aqua-100 rounded-2xl shadow-sm` |
| Primary button | `bg-aqua-700 hover:bg-aqua-800 text-white` (6.2:1 contrast, AA) |
| Secondary button | `border-aqua-200 text-aqua-800 hover:bg-aqua-50` |
| Text | body `text-slate-800`, muted `text-slate-500`, headings `text-aqua-950` |
| Links / focus | `text-aqua-700`; `focus-visible:ring-2 ring-aqua-400 ring-offset-2` |
| Shared badge, active toolbar button | `bg-aqua-100 text-aqua-800` |
| Danger / errors | `text-rose-600`, `bg-rose-50` |
| Note content | `prose prose-slate prose-a:text-aqua-700` |

- Use the existing Geist font, generous whitespace and a centered `max-w-3xl` column. Layouts must work from 360 px wide.
- Remove the scaffold's `dark:` variants and placeholder content, and set the page metadata to "TinyNotes".
- **Header**: "TinyNotes" on the left (links to `/`). On the right, the user's name and **Sign out** when signed in, or **Sign in** otherwise.
- Every input has a label, toolbar buttons have `aria-label` and `aria-pressed`, and focus is always visible. Native `confirm()` is fine for confirmations.
- Dates are absolute and in the viewer's locale, formatted by a `<LocalTime ms />` client component with `suppressHydrationWarning`.
- Buttons show a pending state while their action runs.

## 12. Configuration & housekeeping

| Env var | Required | Value |
|---|---|---|
| `BETTER_AUTH_SECRET` | yes | ≥ 32 random chars (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | yes | `http://localhost:3000`; the base URL for auth and share links |
| `DB_PATH` | no | Defaults to `data/app.db` |

```json
"scripts": {
  "dev":        "bun run db:migrate && bun --bun next dev",
  "build":      "bun --bun next build",
  "start":      "bun run db:migrate && bun --bun next start",
  "lint":       "eslint",
  "test":       "bun test",
  "db:migrate": "bun run scripts/migrate.ts"
}
```

Housekeeping:
- Delete `package-lock.json`.
- `.gitignore`: the existing `.env*` rule also ignores `.env.example`, so add `!.env.example` and `/data/`.
- Add `BETTER_AUTH_URL` to `.env.example`.
- Rewrite the README's "Getting started" section with the Bun commands.

## 13. Project structure

```
app/
  layout.tsx  page.tsx  globals.css  error.tsx  global-error.tsx  not-found.tsx
  sign-in/page.tsx  sign-up/page.tsx
  notes/  actions.ts  page.tsx  new/page.tsx  [id]/page.tsx  [id]/edit/page.tsx
  s/[token]/page.tsx
  api/auth/[...all]/route.ts
components/
  site-header.tsx  auth-form.tsx  sign-out-button.tsx  note-editor.tsx  editor-toolbar.tsx
  save-status.tsx  note-content.tsx  share-panel.tsx  delete-note-button.tsx  local-time.tsx
lib/
  auth.ts  auth-client.ts  session.ts  errors.ts  share-token.ts  autosave.ts
  db/        index.ts  migrate.ts  notes.ts  test-utils.ts
  rich-text/ extensions.ts  validate.ts  render.ts
migrations/  0001_better_auth.sql  0002_note.sql
scripts/     migrate.ts
```

Tests sit next to the module they cover (`lib/**/*.test.ts`). Tested modules must not import `"server-only"`, `next/*` or `lib/db/index.ts`.

## 14. Testing

### 14.1 Unit tests (`bun test`)

`lib/db/test-utils.ts` provides `createTestDb()` and `createTestUser(db)`. `createTestDb()` returns an in-memory DB with the PRAGMAs applied and the real migrations run. Autosave tests use short real delays (10–50 ms) rather than fake timers.

- **Migrations**: a fresh DB gets every migration; a second run applies nothing; a broken file rolls back and stops the run.
- **Notes**: CRUD round-trips the content JSON; `updateNote` bumps `updatedAt` but not `createdAt`; the list is sorted and has no content; deleting a user cascades to their notes.
- **Ownership**: user B's calls on user A's note return `null`/`false` and change nothing.
- **Sharing**: enable then resolve works; enabling twice returns the same token; disable makes the token resolve to `null`; re-enable gives a **new** token and the old one stays dead; deleting the note kills the token; `updatedAt` is unchanged.
- **Share tokens**: format is correct and 1,000 generated tokens are unique.
- **Validation**: accepts a doc using every toolbar feature. Rejects non-objects, unknown nodes and marks (e.g. `image`), content over 256 KiB, and `javascript:`/`data:` links.
- **Rendering**: a fixture renders to the expected HTML, and links carry `target`/`rel`.
- **Errors**: `toActionError` passes `AppError` code and message through, and turns any other error into the generic `INTERNAL` message without leaking the original.
- **Autosave**: a burst of changes produces one save with the latest snapshot; max wait fires during continuous changes; there is never more than one save in flight; `flush` saves immediately; retries follow the delays and then report the error status; `VALIDATION` isn't retried; `NOT_FOUND`/`UNAUTHENTICATED` stop saving.

### 14.2 Manual acceptance checklist

- [ ] Fresh clone: `bun install`, copy `.env.example` → `.env`, `bun dev`. The app runs and the DB is created. On a rerun, no migrations are applied.
- [ ] Sign up, sign in, sign out and the redirects all work. A duplicate email and a wrong password show the right messages.
- [ ] On a new note, typing changes the URL to `/notes/<id>/edit` without losing the cursor. An untouched `/notes/new` creates nothing.
- [ ] The status goes Unsaved → Saving… → Saved about 1 s after typing stops. Reloading keeps everything. Ctrl/Cmd+S saves immediately.
- [ ] With DevTools set to offline: the editor shows an error and retries, and recovers once back online. No content is lost.
- [ ] Every toolbar button works. The view page matches the editor exactly. A `javascript:` link is refused.
- [ ] The list is sorted by last updated, shows "Untitled" for empty titles, and shows the Shared badge.
- [ ] Create a link and open it in a private window: no sign-in needed, no author shown, `noindex` present. Edits show up on refresh.
- [ ] Disabling the link gives a 404 immediately. Re-enabling gives a new URL while the old one stays 404.
- [ ] A second user gets 404 on user A's note URLs and doesn't see A's notes in their list.
- [ ] Deleting a note removes it from the list, and its share URL returns 404.
- [ ] An unknown URL, another user's note and a disabled link all show the same branded 404.
- [ ] A forced server error shows the generic error page with a reference ID and no stack trace or message, in both `bun run build && bun start` and dev. Action responses in the Network tab contain no internals.
- [ ] The aqua styling is applied consistently and every page is usable at 360 px.
- [ ] `bun run lint`, `bun test` and `bun run build` all pass.

## 15. Milestones (one PR each)

| # | Scope | Done when |
|---|---|---|
| M0 | Dependencies, scripts, env, `.gitignore`, delete `package-lock.json`, aqua `@theme` + typography plugin. Spike: a throwaway page that queries `bun:sqlite`. | The spike works under `bun dev` **and** `build` + `start`; then remove it. |
| M1 | `lib/db`, migration runner, `0001`, `0002`, test utils, migration tests | `db:migrate` is idempotent and the tests pass. |
| M2 | better-auth wiring, auth pages, header, landing page, `lib/errors.ts`, `error.tsx`, `global-error.tsx`, `not-found.tsx` | The auth and 404 checklist items pass. |
| M3 | `notes.ts`, `share-token.ts`, `rich-text/*`, `autosave.ts`, with tests | All of §14.1 passes. |
| M4 | Notes UI: list, view, new/edit with autosave and status, delete, actions | The notes, autosave and ownership checklist items pass. |
| M5 | Share panel, sharing actions, `/s/[token]` | The sharing checklist items pass. |
| M6 | Styling pass, README, scaffold cleanup | The full checklist passes. |

## 16. Risks

| Risk | Mitigation |
|---|---|
| Next.js on the Bun runtime is less common than on Node. | Prove it in M0 before building anything else. If it's blocked, escalate to the owner; don't switch drivers. |
| better-auth's schema can drift between versions. | Pin 1.7.7. Regenerate and diff the schema on upgrade (§8.3). |
| Stored XSS through shared notes. | D5, §9.3 and SEC-3, plus the validation tests. |
| Autosave races and lost edits. | Single-flight plus a final save on unmount and when the tab is hidden, `beforeunload`, and the autosave unit tests. |
| TipTap SSR hydration errors. | The editor is a client component with `immediatelyRender: false`. |

**References:**
- better-auth: [SQLite adapter](https://www.better-auth.com/docs/adapters/sqlite), [Next.js integration](https://www.better-auth.com/docs/integrations/next), [Database schema](https://www.better-auth.com/docs/concepts/database)
- TipTap: [Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [Link](https://tiptap.dev/docs/editor/extensions/marks/link), [generateHTML](https://tiptap.dev/docs/editor/api/utilities/html)
- [Bun SQLite](https://bun.com/docs/api/sqlite)
- Next.js: [error handling](https://nextjs.org/docs/app/getting-started/error-handling), [data security](https://nextjs.org/docs/app/guides/data-security)
