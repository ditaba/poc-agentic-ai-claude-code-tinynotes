import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Type-checks route literals in <Link href>, useRouter() and redirect().
  typedRoutes: true,
  async headers() {
    return [
      {
        // Public share pages: never leak the link through the Referer header, and
        // keep them out of search engines (PUB-4, SEC-4). Sent as headers because
        // streamed metadata tags may end up in <body>.
        source: '/s/:token',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Sign-in and sign-up share one page; these keep SPEC's links working.
      { source: '/sign-in', destination: '/auth?mode=sign-in', permanent: false },
      { source: '/sign-up', destination: '/auth?mode=sign-up', permanent: false },
      // The note list lives on the dashboard.
      { source: '/notes', destination: '/dashboard', permanent: false },
    ];
  },
};

export default nextConfig;
