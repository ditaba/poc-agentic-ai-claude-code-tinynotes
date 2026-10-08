import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { describe, expect, test, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getCurrentUser, requireUser } from './session';

// headers() only works inside a request, so tests supply the request headers.
// The rest of next/headers stays real: better-auth's nextCookies plugin uses it.
vi.mock('next/headers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/headers')>()),
  headers: vi.fn(async () => new Headers()),
}));
// Real redirect(), with call tracking.
vi.mock('next/navigation', { spy: true });

let emailCount = 0;

// Signs up a new user through better-auth and sends its session cookie with
// the next requests.
async function signUpAndUseCookie(name: string) {
  const email = `session-${++emailCount}@example.com`;
  const response = await auth.api.signUpEmail({
    body: { name, email, password: 'correct-horse' },
    asResponse: true,
  });
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  vi.mocked(headers).mockResolvedValue(new Headers({ cookie }) as never);
  return { email };
}

describe('getCurrentUser', () => {
  test('returns null without a session', async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  test('returns the user whose session cookie came with the request', async () => {
    const { email } = await signUpAndUseCookie('Ada');
    expect(await getCurrentUser()).toMatchObject({ name: 'Ada', email });
  });

  test('ignores an invalid session cookie', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ cookie: 'better-auth.session_token=forged.token' }) as never,
    );
    expect(await getCurrentUser()).toBeNull();
  });
});

describe('requireUser', () => {
  test('sends signed-out visitors to /auth', async () => {
    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth');
  });

  test('returns the signed-in user', async () => {
    await signUpAndUseCookie('Grace');
    expect(await requireUser()).toMatchObject({ name: 'Grace' });
    expect(redirect).not.toHaveBeenCalled();
  });
});
