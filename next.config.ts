import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sign-in and sign-up share one page; these keep SPEC's links working.
  async redirects() {
    return [
      { source: "/sign-in", destination: "/auth?mode=sign-in", permanent: false },
      { source: "/sign-up", destination: "/auth?mode=sign-up", permanent: false },
    ];
  },
};

export default nextConfig;
