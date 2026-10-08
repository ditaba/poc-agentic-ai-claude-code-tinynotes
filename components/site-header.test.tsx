import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderPage } from '@/test/next';
import { signInAs } from '@/test/session';
import { SiteHeader } from './site-header';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', { spy: true });

beforeEach(() => {
  // The sign-out button needs Next's router, which only exists inside the app.
  vi.mocked(useRouter).mockReturnValue({ replace: vi.fn(), refresh: vi.fn() } as never);
});

describe('SiteHeader', () => {
  test('links the logo to the dashboard', async () => {
    signInAs(null);
    expect(await renderPage(SiteHeader())).toMatch(/<a[^>]*href="\/dashboard"[^>]*>NextNotes<\/a>/);
  });

  test('offers signed-out visitors a sign-in link', async () => {
    signInAs(null);

    const html = await renderPage(SiteHeader());

    expect(html).toMatch(/<a[^>]*href="\/auth"[^>]*>Sign in<\/a>/);
    expect(html).not.toContain('Sign out');
  });

  test("shows the signed-in user's name, escaped, and a sign-out button", async () => {
    signInAs({ id: 'u1', name: 'Ada <b>Lovelace</b>' });

    const html = await renderPage(SiteHeader());

    expect(html).toContain('Ada &lt;b&gt;Lovelace&lt;/b&gt;');
    expect(html).toMatch(/<button[^>]*>Sign out<\/button>/);
    expect(html).not.toMatch(/href="\/auth"/);
  });
});
