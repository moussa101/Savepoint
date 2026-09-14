import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.igdb.com' }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    authInterrupts: true,
  },
  async redirects() {
    return [{ source: '/diary', destination: '/library', permanent: true }];
  },
  async headers() {
    // CSP is set per-request in middleware (nonce-based). Keep the rest here.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
