import { describe, expect, test } from 'vitest';
import nextConfig from './next.config';

describe('next.config', () => {
  test('keeps share links out of Referer headers and search engines (PUB-4, SEC-4)', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const shareRule = rules.find((rule) => rule.source === '/s/:token');

    expect(shareRule?.headers).toEqual(
      expect.arrayContaining([
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ]),
    );
  });

  test("redirects SPEC's routes to the pages that replace them", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: '/sign-in', destination: '/auth?mode=sign-in', permanent: false },
        { source: '/sign-up', destination: '/auth?mode=sign-up', permanent: false },
        { source: '/notes', destination: '/dashboard', permanent: false },
      ]),
    );
  });
});
