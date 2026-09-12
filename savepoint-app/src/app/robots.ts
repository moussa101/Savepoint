import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/games', '/games/', '/profile/', '/privacy', '/terms', '/login', '/register'],
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
          '/lists',
          '/diary',
          '/verify',
          '/auth/',
          '/forgot-password',
          '/reset-password',
          '/login/steam',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
