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
  },
  async redirects() {
    return [{ source: '/diary', destination: '/library', permanent: true }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://images.igdb.com https://*.r2.dev https://*.cloudflarestorage.com https://authjs.dev https://*.googleusercontent.com https://lh3.googleusercontent.com https://cdn.discordapp.com https://media.discordapp.net https://avatars.steamstatic.com https://*.steamstatic.com https://steamcdn-a.akamaihd.net https://*.akamaihd.net https://graph.microsoft.com https://*.xboxlive.com https://*.live.net",
              "connect-src 'self' https://api.igdb.com https://id.twitch.tv https://api.sightengine.com https://api.steampowered.com https://steamcommunity.com https://api.xbl.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://steamcommunity.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
