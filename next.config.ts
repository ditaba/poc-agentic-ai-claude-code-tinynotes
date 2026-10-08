import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type-checks route literals in <Link href>, useRouter() and redirect().
  typedRoutes: true,
  async redirects() {
    return [
      // Sign-in and sign-up share one page; these keep SPEC's links working.
      { source: "/sign-in", destination: "/auth?mode=sign-in", permanent: false },
      { source: "/sign-up", destination: "/auth?mode=sign-up", permanent: false },
      // The note list lives on the dashboard.
      { source: "/notes", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
