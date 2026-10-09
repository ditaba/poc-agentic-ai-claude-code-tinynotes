import 'server-only';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';

const NAME_MAX_LENGTH = 100;

// The secret and base URL come from BETTER_AUTH_SECRET and BETTER_AUTH_URL.
export const auth = betterAuth({
  // better-auth has no built-in libSQL support, but takes any Kysely dialect.
  // Passing the app's client means one connection for auth and notes alike.
  database: { dialect: new LibsqlDialect({ client: db }), type: 'sqlite' },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  databaseHooks: {
    user: {
      create: {
        // better-auth doesn't validate names, so the server enforces AUTH-1 here.
        before: async (user) => {
          const name = user.name.trim();
          if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
            throw APIError.from('BAD_REQUEST', {
              code: 'INVALID_NAME',
              message: 'Name must be 1–100 characters',
            });
          }
          return { data: { ...user, name } };
        },
      },
    },
  },
  // There's no profile page, and this endpoint would accept any name.
  disabledPaths: ['/update-user'],
  // Must stay the last plugin. It skips session refreshes in server component
  // requests (which can't set cookies) and writes refreshed cookies in Server Actions.
  plugins: [nextCookies()],
});
