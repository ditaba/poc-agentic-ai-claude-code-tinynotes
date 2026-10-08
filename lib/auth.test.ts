import { describe, expect, test } from 'vitest';
import { auth } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth-messages';

// Runs the real better-auth setup from lib/auth.ts against the in-memory test
// database (see vitest.config.mts), so the rules and error codes are better-auth's own.

const GENERIC = 'Something went wrong. Please try again.';

let emailCount = 0;
const uniqueEmail = () => `user-${++emailCount}@example.com`;

type Credentials = { name: string; email: string; password: string };

async function readResponse(response: Response) {
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  return { status: response.status, body: await response.json(), cookie };
}

async function signUp(overrides: Partial<Credentials> = {}) {
  const body = { name: 'Ada', email: uniqueEmail(), password: 'correct-horse', ...overrides };
  return readResponse(await auth.api.signUpEmail({ body, asResponse: true }));
}

async function signIn(email: string, password: string) {
  return readResponse(await auth.api.signInEmail({ body: { email, password }, asResponse: true }));
}

function sessionUser(cookie: string) {
  return auth.api.getSession({ headers: new Headers({ cookie }) }).then((s) => s?.user ?? null);
}

// A rejected request, with the message the auth form would show for it.
function expectRejected(result: { status: number; body: { code?: string } }, code: string) {
  expect(result.status).toBeGreaterThanOrEqual(400);
  expect(result.body.code).toBe(code);
  expect(authErrorMessage(code)).not.toBe(GENERIC);
}

describe('sign-up', () => {
  test('trims the name, lowercases the email and starts a session', async () => {
    const email = `Ada.${uniqueEmail()}`.toUpperCase();
    const result = await signUp({ name: '  Ada Lovelace  ', email });

    expect(result.status).toBe(200);
    expect(result.body.user).toMatchObject({ name: 'Ada Lovelace', email: email.toLowerCase() });
    expect(await sessionUser(result.cookie)).toMatchObject({ name: 'Ada Lovelace' });
  });

  test('requires a name of 1 to 100 characters after trimming (AUTH-1)', async () => {
    expectRejected(await signUp({ name: '   ' }), 'INVALID_NAME');
    expectRejected(await signUp({ name: 'x'.repeat(101) }), 'INVALID_NAME');
    expect((await signUp({ name: ` ${'x'.repeat(100)} ` })).status).toBe(200);
  });

  test('requires a password of 8 to 128 characters', async () => {
    expectRejected(await signUp({ password: 'x'.repeat(7) }), 'PASSWORD_TOO_SHORT');
    expectRejected(await signUp({ password: 'x'.repeat(129) }), 'PASSWORD_TOO_LONG');
    expect((await signUp({ password: 'x'.repeat(8) })).status).toBe(200);
    expect((await signUp({ password: 'x'.repeat(128) })).status).toBe(200);
  });

  test('rejects an email that is already registered, in any letter case', async () => {
    const email = uniqueEmail();
    await signUp({ email });

    const result = await signUp({ email: email.toUpperCase() });

    expectRejected(result, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
    expect(authErrorMessage(result.body.code)).toBe('An account with this email already exists');
  });
});

describe('sign-in', () => {
  test('starts a session with the right password', async () => {
    const email = uniqueEmail();
    await signUp({ email, name: 'Grace' });

    const result = await signIn(email, 'correct-horse');

    expect(result.status).toBe(200);
    expect(await sessionUser(result.cookie)).toMatchObject({ name: 'Grace', email });
  });

  test("gives the same error for a wrong password and an unknown email, so it doesn't reveal accounts", async () => {
    const email = uniqueEmail();
    await signUp({ email });

    const wrongPassword = await signIn(email, 'wrong-password');
    const unknownEmail = await signIn(uniqueEmail(), 'correct-horse');

    expectRejected(wrongPassword, 'INVALID_EMAIL_OR_PASSWORD');
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });
});

describe('sessions', () => {
  test('ignore requests without a valid session cookie', async () => {
    expect(await sessionUser('')).toBeNull();
    expect(await sessionUser('better-auth.session_token=forged.token')).toBeNull();
  });

  test("can't change the user's name: the update-user endpoint is disabled", async () => {
    const { cookie } = await signUp({ name: 'Ada' });

    const response = await auth.handler(
      new Request('http://localhost:3000/api/auth/update-user', {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ name: 'Mallory' }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await sessionUser(cookie)).toMatchObject({ name: 'Ada' });
  });
});
