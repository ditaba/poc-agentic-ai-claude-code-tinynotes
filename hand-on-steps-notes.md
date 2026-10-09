# TinyNotes — Hands-on Steps

| Lesson | Topic                                               | Prompts     |
| ------ | --------------------------------------------------- | ----------- |
| ✅ 21  | Prompt Engineering in Action & Working with Specs   | #1, #2      |
| ✅ 23  | Initializing Claude Projects                        | —           |
| ✅ 26  | Leveraging Plan Mode (`Shift + Tab`)                | #3          |
| ✅ 27  | Using Claude Code's Built-in Tools                  | —           |
| ✅ 28  | Using MCP Servers & More On Permissions             | #4          |
| ✅ 29  | Understanding Subagents                             | #5          |
| ✅ 30  | Creating and Using a Custom Subagent                | —           |
| ✅ 31  | Encouraging Agent Usage                             | #6          |
| ✅ 33  | Adding Custom Skills                                | #7          |
| ✅ 36  | Iterating On The Demo App                           | #8, #9, #10 |
| ✅ 38  | Building & Using Custom Commands (Prompt Templates) | #11         |
| ✅ 39  | Using Screenshots For Prompting with Feedback       | #12, #13    |
| ✅ 40  | Understanding & Using Hooks                         | #14         |
| ✅ 41  | Installing & Using Plugins                          | —           |
| ✅ 42  | Creating Feedback Loops by Granting Browser Access  | #15         |
| ✅ 43  | Providing Feedback via Automated Tests              | #16         |

## ✅ Lesson 21 — Prompt Engineering in Action & Working with Specs

1. **Prompt #1 — Create `SPEC.md`** · _Claude chat_

   ```text
   I'll build a "TinyNotes" application that will allow users to:
   - authenticate
   - create & manage (view, edit, delete) notes
   - share notes publicly => create a public "share" link which can also be disabled by the creator
   - unauthenticated users can view shared notes via that link

   A "note" is a formatted piece of text (= rich text) stored as JSON and rendered as HTML.

   It'll be a Bun + TypeScript + Next.js project, using TailwindCSS for styling.
   For rich text editing, the TipTap library & editor will be used.
   For authentication via email + password (simple setup: no password resets, no email confirmation, no email sending).

   Data will be stored in a SQLite database, using Bun's built-in SQLite client.
   No files will be stored (=> no image upload or embedding in the notes).

   We'll use raw SQL (no library) statements and a custom migrations script. For the database schema, we'll build our own, though for user/auth-related schemas, we have to use the ones specified by better-auth.

   This is a demo app and deliberately kept simple to some extent.

   Based on my instructions, I want you to generate a SPEC file for me which I can hand off to my colleagues to build this app. Any additional information you need for that?
   ```

2. **Prompt #2 — Enhance `SPEC.md`** · _Claude Code CLI_

   ```text
   Great default, let's use them.

   Important: NO "/settings" route, we'll implement auto-saving. We'll also need proper error handling (without leaking important details to the client-side) and a 404 page.
   And for styling, let's use elegant acqua colors.

   Here is the expected better-auth db schema (right from their official docs):
   <better-auth-db-schema>
    [copy content of #core-schema pasting HERE - https://better-auth.com/docs/concepts/database#core-schema]
   </better-auth-db-schema>

   Generate a detailed SPEC file (including db schemas) based on all these clarifications and details.
   Keep it as concise as possible without leaving out inportant information.
   ```

## ✅ Lesson 23 — Initializing Claude Projects

1. **Terminal**

   ```bash
   npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
   ```

2. **Claude Code CLI**
   - `/clear` — start a new session with a clean context
   - `/init` — create `CLAUDE.md`

## ✅ Lesson 26 — Leveraging Plan Mode (`Shift + Tab`)

1. **Prompt #3** · _Claude Code CLI_

   ```text
   Let's start building the application described in @SPEC.MD .

   Start by setting up the core route structure. Only add a dummy message to each page. No actual page content yet.

   Just create all those different page.tsx files for the different application routes. Don't implement authentication yet.
   ```

## ✅ Lesson 27 — Using Claude Code's Built-in Tools

## ✅ Lesson 28 — Using MCP Servers & More On Permissions

1. **Install the context7 MCP server**

   ```bash
   claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
   ```

   Reference: <https://context7.com/docs/resources/all-clients>

2. **Prompt #4** · _Claude Code CLI_

   ```text
   Implement authentication and database access as described in @SPEC.MD .

   Add a "lib" folder with "auth.ts" and "db.ts" files. Export a db handle in the db.ts file and make sure WAL mode is used and all required database tables are created if they don't exist yet.

   Use web search or the context7 mcp to find the relevant documentation for Bun SQLite and better-auth setup (with next.js and Bun SQLite).
   ```

3. **Generate `BETTER_AUTH_SECRET`** (terminal)

   ```bash
   bunx @better-auth/cli secret
   ```

## ✅ Lesson 29 — Understanding Subagents

1. **Prompt #5** · _Claude Code CLI_

   ```text
   We're building @SPEC.MD .

   Please evaluate the existing codebase to check wether authentication and database access are implemented correctly (in line with the expectations explained in SPEC.MD and the official documentation for the libraries / technologies used).

   Use web search or the context7 mcp to look up docs.
   ```

## ✅ Lesson 30 — Creating and Using a Custom Subagent

## ✅ Lesson 31 — Encouraging Agent Usage

1. Add `DocsExplorer.md` to `.claude/agents/`.
2. Add this text to `CLAUDE.md`:

   ```text
   Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
   Use the DocsExplorer subagent for efficient documentation lookup.
   ```

3. **Prompt #6** · _Claude Code CLI_

   ```text
   We're building @SPEC.MD .

   Please evaluate the existing codebase to check whether authentication and database access are implemented correctly (in line with the expectations explained in SPEC.MD and the official documentation for the libraries / technologies used).
   ```

## ✅ Lesson 33 — Adding Custom Skills

1. Copy the skills into the project.
2. **Prompt #7** · _Claude Code CLI · Plan mode_

   ```text
   Let's add a proper authentication route / page content to this app. We only support email + password auth.
   Users can switch between modes, implemented via search params.

   No password resetting for this demo app.
   ```

## ✅ Lesson 36 — Iterating On The Demo App

1. **Prompt #8** · _Claude Code CLI · Plan mode_

   ```text
   We added authentication (see @app/authenticate/page.tsx , @lib/auth.ts ).

   As a next step, add the following features:
   - after successful authentication, redirect the user to "/dashboard"
   - protect "/dashboard" and all other note-related routes (except the publicly shared notes route) from unauthenticated access => add protection on a per-route level (NOT via layout)

   User modern Next.js features and focus on writing clean, efficient React / Next.js code.
   ```

2. **Prompt #9** · _Claude Code CLI · Plan mode_

   ```text
   Add the following features to our web app:
   - header component with title logo ("NextNotes") which links to "/dashboard" (using Next <Link>)
   - On @app/dashboard/page.tsx , add "New Note" link that links to the appropriate route
   - On the "New Note" route, add a <form> with the title input and rich text content input
   - Implement form submission handling + insert data into database

   Ensure modern, clean React & Next.js code with accessible JSX and clean, modern Tailwind styling.
   ```

3. **Prompt #10** · _Claude Code CLI · Plan mode_

   ```text
   On the new note (or edit note) page, add a toolbar that exposes the TipTap tools we want in our app (see @SPEC.MD ) and makes using them simple.
   ```

## ✅ Lesson 38 — Building & Using Custom Commands (Prompt Templates)

1. Add `.claude/commands/code-review.md`.
2. **Prompt #11** · _Claude Code CLI_

   ```text
   /code-review BUGS,SECURITY
   ```

## ✅ Lesson 39 — Using Screenshots For Prompting with Feedback

1. **Prompt #12** · _Claude Code CLI_

   ```text
   In out app, add the following features:
   - display all notes that belong to the logged in user on the "/dashboard" route
   - upon clicking on a note, link to the "viewing page"
   - on that viewing page, render the note (JSON => custom JSX elements, with proper styling)
   ```

2. **Prompt #13** · _Claude Code CLI_

   ```text
   In out app, make the notes editable and deletable.

   When viewing a note (as the creator of it), on that viewing page, there should be "Edit" and "Delete" buttons.

   "Edit" should be a link to the edit page where the note gets loaded into the TipTap editor. The title also should be editable.

   "Delete" should be a button that opens a confirmation <dialog>. Once confirmed, the note should be removed from the database and the user should be navigated back to "/dashboard" route.
   ```

3. Nếu có lỗi xảy ra thì chụp hình rồi kêu nó sửa.

## ✅ Lesson 40 — Understanding & Using Hooks

1. Install oxfmt: `bun add -D oxfmt`
2. Add the script `"format": "oxfmt"` to `package.json`.
3. Create `.oxfmtrc.json`: `bunx oxfmt --init`
4. Update `.oxfmtrc.json`.
5. Run `bun run format`.
6. Add the `hooks` config to `.claude/settings.json` (reference: <https://code.claude.com/docs/en/hooks>).
7. List the hooks in Claude Code: `/hooks`
8. **Prompt #14** · _Claude Code CLI_

   ```text
   In our web-app, add the "public sharing" feature.

   When adding or editing a note the user (owner) should be able to turn on public sharing. This must generate a unique link that leads to the note.

   When other users (including guest users who did not sign in) follow that link they can see the note but of course they can't edit or delete it. If sharing is turn off, the link should not lead anywhere anymore.
   ```

## ✅ Lesson 41 — Installing & Using Plugins

1. List the plugins in Claude Code: `/plugin`
2. Install `typescript-lsp` with local project scope.

## ✅ Lesson 42 — Creating Feedback Loops by Granting Browser Access

1. **Prompt #15** · _Claude Code CLI_

   ```text
   Test the application you built, using the playwright plugin / MCP. Test all main features step by step and ensure they work correctly.

   The application dev server is already up and running on port 3001.

   Fix all issues you find.
   ```

## ✅ Lesson 43 — Providing Feedback via Automated Tests

1. Install Vitest as a dev dependency: `bun add -D vitest`
2. **Prompt #16** · _Claude Code CLI_

   ```text
   I installed the Vitest library to do unit testing.

   Set it up appropriately and add unit tests for all the key features of this app. Add mocks as needed and split complex functions up to simplify testing, if needed.
   ```
