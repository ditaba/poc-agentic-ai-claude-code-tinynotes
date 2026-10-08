import { describe, expect, test, vi } from 'vitest';
import { authClient } from '@/lib/auth-client';
import { signOut, submitAuthForm } from './auth-requests';

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: vi.fn() }, signUp: { email: vi.fn() }, signOut: vi.fn() },
}));

const GENERIC = 'Something went wrong. Please try again.';

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

// better-auth's client resolves to { data, error } instead of throwing.
const succeed = () => ({ data: {}, error: null }) as never;
const fail = (code: string) => ({ data: null, error: { code, status: 400 } }) as never;

describe('submitAuthForm', () => {
  const fields = { name: '  Ada Lovelace  ', email: 'ada@example.com', password: 'correct-horse' };

  test('signs up with the trimmed name', async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue(succeed());

    const state = await submitAuthForm('sign-up', formData(fields));

    expect(authClient.signUp.email).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse',
    });
    expect(state).toEqual({ error: null, name: 'Ada Lovelace', email: 'ada@example.com' });
  });

  test('rejects a name made only of spaces without calling better-auth', async () => {
    const state = await submitAuthForm('sign-up', formData({ ...fields, name: '   ' }));

    expect(state.error).toBe('Enter your name');
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  test('signs in with only the email and password', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue(succeed());

    const state = await submitAuthForm('sign-in', formData(fields));

    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct-horse',
    });
    expect(authClient.signUp.email).not.toHaveBeenCalled();
    expect(state.error).toBeNull();
  });

  test('shows a fixed message for better-auth errors and keeps the email but not the password', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue(fail('INVALID_EMAIL_OR_PASSWORD'));

    const state = await submitAuthForm('sign-in', formData(fields));

    expect(state).toEqual({
      error: 'Invalid email or password',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(JSON.stringify(state)).not.toContain('correct-horse');
  });

  test('shows the generic message for unknown codes and network failures', async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue(fail('SOME_NEW_CODE'));
    expect((await submitAuthForm('sign-up', formData(fields))).error).toBe(GENERIC);

    vi.mocked(authClient.signUp.email).mockRejectedValue(new TypeError('Failed to fetch'));
    expect((await submitAuthForm('sign-up', formData(fields))).error).toBe(GENERIC);
  });

  test('treats missing fields as empty', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue(succeed());
    await submitAuthForm('sign-in', new FormData());
    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: '', password: '' });
  });
});

describe('signOut', () => {
  test('returns null after signing out', async () => {
    vi.mocked(authClient.signOut).mockResolvedValue(succeed());
    expect(await signOut()).toBeNull();
  });

  test('returns a message when better-auth reports an error or the request fails', async () => {
    vi.mocked(authClient.signOut).mockResolvedValue(fail('FAILED_TO_GET_SESSION'));
    expect(await signOut()).toBe("Couldn't sign out");

    vi.mocked(authClient.signOut).mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await signOut()).toBe("Couldn't sign out");
  });
});
