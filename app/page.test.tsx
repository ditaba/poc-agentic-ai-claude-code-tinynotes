import { describe, expect, test, vi } from 'vitest';
import { renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import HomePage from './page';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

describe('landing page', () => {
  test('invites signed-out visitors to sign up or sign in', async () => {
    signInAs(null);

    const html = await renderPage(HomePage());

    expect(html).toMatch(/<h1[^>]*>Simple notes you can share<\/h1>/);
    expect(html).toMatch(/<a[^>]*href="\/auth\?mode=sign-up"[^>]*>Create an account<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/auth\?mode=sign-in"[^>]*>Sign in<\/a>/);
  });
});
