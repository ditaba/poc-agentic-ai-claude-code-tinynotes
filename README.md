# TinyNotes

A small notes app: email/password sign-in, rich-text notes that save as you type, and public share links you can revoke. Built with Next.js 16, better-auth and TipTap. The database is libSQL: a local file in development and [Turso](https://turso.tech) in production. See [SPEC.md](SPEC.md) for the full specification.

## Getting started

You need [Bun](https://bun.sh) 1.3+ and Node.js 22+.

```bash
bun install
cp .env.example .env    # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
bun dev                 # creates data/app.db, then starts http://localhost:3000
```

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `bun dev`            | Applies the schema, then starts the dev server       |
| `bun run build`      | Applies the schema, then builds for production       |
| `bun start`          | Serves the production build                          |
| `bun run test`       | Runs the unit tests (Vitest; not `bun test`)         |
| `bun run lint`       | Runs ESLint                                          |
| `bun run db:migrate` | Creates any missing tables at `TURSO_DATABASE_URL`   |

## Deploy on Vercel

1. Import the repo into Vercel. It detects Next.js and Bun on its own.
2. Add the **Turso** integration from the Vercel Marketplace. It creates a database and sets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. `BETTER_AUTH_URL` is the production URL, such as `https://your-app.vercel.app`. It's also the base of share links.
4. Scope every variable to **Production**, and to **Preview** too if you use preview deployments. Then redeploy: variable changes only apply to new deployments.

Every build runs `db:migrate` first, so the build log should show `Database schema is up to date.`

Sign-in only works on the domain in `BETTER_AUTH_URL`, because better-auth rejects requests from other origins. Preview URLs show the app but can't sign in.
