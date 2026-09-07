import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';

/**
 * Shared, non-personal reads that appear on hot pages (Discover, landing, feed
 * sidebar). Every database round-trip costs hundreds of milliseconds when the
 * database is in another region, so these are served from the Next.js Data
 * Cache and refreshed in the background at most once per `revalidate` window.
 *
 * Nothing here depends on the current user — never add per-user data.
 * Note: results are JSON-serialized, so `Date` fields come back as ISO strings.
 */

export const CACHE_TAGS = {
  lists: 'lists',
  reviews: 'reviews',
  games: 'games',
  stats: 'stats',
} as const;

/** Call after a review is created, edited or removed. */
export function invalidateReviewsCache() {
  revalidateTag(CACHE_TAGS.reviews, 'max');
}

/** Call after a list is created, edited, liked or removed. */
export function invalidateListsCache() {
  revalidateTag(CACHE_TAGS.lists, 'max');
}

/** Top public lists for the Discover page. */
export const getPopularListsCached = unstable_cache(
  async () =>
    prisma.list.findMany({
      where: { visibility: 'PUBLIC', items: { some: {} } },
      include: {
        user: { select: { name: true, username: true, image: true } },
        items: {
          include: { game: { select: { coverImage: true } } },
          orderBy: { order: 'asc' },
          take: 4,
        },
        _count: { select: { items: true, likes: true } },
      },
      orderBy: [{ likes: { _count: 'desc' } }, { items: { _count: 'desc' } }],
      take: 4,
    }),
  ['popular-lists'],
  { revalidate: 60, tags: [CACHE_TAGS.lists] }
);

/** Latest community reviews for the Discover page. */
export const getRecentReviewsCached = unstable_cache(
  async () =>
    prisma.review.findMany({
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        game: { select: { name: true, slug: true, coverImage: true } },
        user: { select: { username: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ['recent-reviews'],
  { revalidate: 60, tags: [CACHE_TAGS.reviews] }
);

/** Most-rated games, shown in the feed sidebar. */
export const getTrendingGamesCached = unstable_cache(
  async () =>
    prisma.game.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
        avgRating: true,
        ratingCount: true,
      },
      orderBy: { ratingCount: 'desc' },
      take: 5,
    }),
  ['trending-games'],
  { revalidate: 300, tags: [CACHE_TAGS.games] }
);

/** Aggregate counters for the landing page. */
export const getSiteStatsCached = unstable_cache(
  async () => {
    const [totalUsers, totalReviews] = await Promise.all([
      prisma.user.count(),
      prisma.review.count(),
    ]);
    return { totalUsers, totalReviews };
  },
  ['site-stats'],
  { revalidate: 300, tags: [CACHE_TAGS.stats] }
);
