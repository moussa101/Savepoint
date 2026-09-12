import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/games'), lastModified: now, changeFrequency: 'hourly', priority: 0.95 },
    { url: absoluteUrl('/login'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/register'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let gameRoutes: MetadataRoute.Sitemap = [];
  let profileRoutes: MetadataRoute.Sitemap = [];
  let listRoutes: MetadataRoute.Sitemap = [];

  try {
    const [games, profiles, lists] = await Promise.all([
      prisma.game.findMany({
        where: { slug: { not: '' } },
        select: { slug: true, updatedAt: true },
        orderBy: [{ avgRating: 'desc' }, { updatedAt: 'desc' }],
        take: 2000,
      }),
      prisma.user.findMany({
        where: {
          isBanned: false,
          isPrivate: false,
          onboarded: true,
        },
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      }),
      prisma.list.findMany({
        where: { visibility: 'PUBLIC' },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 2000,
      }),
    ]);

    gameRoutes = games.map((g) => ({
      url: absoluteUrl(`/games/${g.slug}`),
      lastModified: g.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    profileRoutes = profiles.map((u) => ({
      url: absoluteUrl(`/profile/${u.username}`),
      lastModified: u.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    listRoutes = lists.map((l) => ({
      url: absoluteUrl(`/lists/${l.id}`),
      lastModified: l.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error('sitemap generation failed', err);
  }

  return [...staticRoutes, ...gameRoutes, ...profileRoutes, ...listRoutes];
}

