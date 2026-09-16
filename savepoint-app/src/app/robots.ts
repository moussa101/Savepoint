import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/settings',
          '/messages',
          '/messages/',
          '/onboarding',
          '/library',
          '/friends',
          '/feed',
          // Only the private "My Lists" index — public /lists/[id] must stay crawlable.
          '/lists$',
          '/diary',
          '/verify',
          '/auth/',
          '/forgot-password',
          '/reset-password',
          '/login/steam',
          '/forums/new',
        ],
      },
      {
        // Keep AI crawlers aligned with the public surface.
        userAgent: 'GPTBot',
        allow: ['/', '/games', '/games/', '/profile/', '/privacy', '/terms'],
        disallow: ['/api/', '/admin/', '/settings', '/messages', '/library', '/feed', '/friends'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
