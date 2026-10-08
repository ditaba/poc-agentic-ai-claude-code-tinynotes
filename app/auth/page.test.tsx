import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { pageProps, renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import AuthPage, { generateMetadata } from './page';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', { spy: true });

beforeEach(() => {
  signInAs(null);
  // The auth form needs Next's router, which only exists inside the app.
  vi.mocked(useRouter).mockReturnValue({ replace: vi.fn(), refresh: vi.fn() } as never);
});

const open = (mode?: string) => renderPage(AuthPage(pageProps({}, { mode })));

describe('auth page', () => {
  test('?mode=sign-up shows the sign-up form', async () => {
    const html = await open('sign-up');

    expect(html).toMatch(/<h1[^>]*>Create your account<\/h1>/);
    expect(html).toMatch(/<input[^>]*name="name"/);
    expect(html).toMatch(/<input id="password"[^>]*autoComplete="new-password"/);
    expect(html).toContain('8–128 characters');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Create account<\/button>/);
    expect(html).toMatch(/<a[^>]*href="\/auth\?mode=sign-in"[^>]*>Sign in<\/a>/);
  });

  test.each([undefined, 'sign-in', 'anything-else'])(
    '?mode=%s shows the sign-in form',
    async (mode) => {
      const html = await open(mode);

      expect(html).toMatch(/<h1[^>]*>Sign in<\/h1>/);
      expect(html).not.toMatch(/name="name"/);
      expect(html).toMatch(/<input id="password"[^>]*autoComplete="current-password"/);
      expect(html).toMatch(/<a[^>]*href="\/auth\?mode=sign-up"[^>]*>Create one<\/a>/);
    },
  );

  test('offers no password reset (out of scope)', async () => {
    expect(await open('sign-in')).not.toMatch(/forgot|reset/i);
  });

  test('titles the page by mode', async () => {
    expect(await generateMetadata(pageProps({}, { mode: 'sign-up' }))).toEqual({
      title: 'Sign up',
    });
    expect(await generateMetadata(pageProps({}, { mode: 'nope' }))).toEqual({ title: 'Sign in' });
  });
});
