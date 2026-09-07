'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type PopularWithFriendsGame = {
  id: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  genres: string[];
  rating: number;
  score: number;
  reason: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 16;

async function friendIdsFor(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const h = minutes / 60;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1).replace(/\.0$/, '')}h`;
}

function friendLabel(username: string | null | undefined, name: string | null | undefined) {
  return name?.trim() || (username ? `@${username}` : 'a friend');
}

/**
 * Games friends have been playing / updating this week, ranked by
 * friend count + playtime (Letterboxd-style “Popular with friends”).
 */
export async function getPopularWithFriends(): Promise<PopularWithFriendsGame[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const friendIds = await friendIdsFor(session.user.id);
    if (friendIds.length === 0) return [];

    const weekAgo = new Date(Date.now() - WEEK_MS);

    const [recentLibrary, recentActivity] = await Promise.all([
      prisma.userGame.findMany({
        where: {
          userId: { in: friendIds },
          status: { in: ['PLAYING', 'COMPLETED'] },
          OR: [{ updatedAt: { gte: weekAgo } }, { lastSyncedAt: { gte: weekAgo } }],
        },
        select: {
          gameId: true,
          playtimeMinutes: true,
          status: true,
          userId: true,
          user: { select: { username: true, name: true } },
          game: {
            select: {
              id: true,
              name: true,
              slug: true,
              coverImage: true,
              avgRating: true,
              genres: { select: { genre: true }, take: 3 },
            },
          },
        },
        orderBy: { playtimeMinutes: 'desc' },
        take: 300,
      }),
      prisma.activity.findMany({
        where: {
          userId: { in: friendIds },
          createdAt: { gte: weekAgo },
          type: { in: ['TRACKING', 'REVIEW', 'FAVORITE'] },
        },
        select: {
          userId: true,
          type: true,
          user: { select: { username: true, name: true } },
          userGame: {
            select: {
              gameId: true,
              playtimeMinutes: true,
              game: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImage: true,
                  avgRating: true,
                  genres: { select: { genre: true }, take: 3 },
                },
              },
            },
          },
          review: {
            select: {
              gameId: true,
              game: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImage: true,
                  avgRating: true,
                  genres: { select: { genre: true }, take: 3 },
                },
              },
            },
          },
          favorite: {
            select: {
              gameId: true,
              game: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImage: true,
                  avgRating: true,
                  genres: { select: { genre: true }, take: 3 },
                },
              },
            },
          },
        },
        take: 200,
      }),
    ]);

    type Agg = {
      game: NonNullable<(typeof recentLibrary)[0]['game']>;
      friendKeys: Set<string>;
      friendNames: string[];
      playtimeByFriend: Map<string, number>;
      playingBoost: number;
    };

    const byGame = new Map<string, Agg>();

    function touch(
      game: Agg['game'] | null | undefined,
      friendKey: string,
      displayName: string,
      playtimeMinutes: number,
      playing: boolean
    ) {
      if (!game?.id || !game.slug) return;
      let row = byGame.get(game.id);
      if (!row) {
        row = {
          game,
          friendKeys: new Set(),
          friendNames: [],
          playtimeByFriend: new Map(),
          playingBoost: 0,
        };
        byGame.set(game.id, row);
      }
      if (!row.friendKeys.has(friendKey)) {
        row.friendKeys.add(friendKey);
        if (row.friendNames.length < 3) row.friendNames.push(displayName);
      }
      const prev = row.playtimeByFriend.get(friendKey) || 0;
      row.playtimeByFriend.set(friendKey, Math.max(prev, playtimeMinutes || 0));
      if (playing) row.playingBoost = 1;
    }

    for (const ug of recentLibrary) {
      touch(
        ug.game,
        ug.userId,
        friendLabel(ug.user.username, ug.user.name),
        ug.playtimeMinutes || 0,
        ug.status === 'PLAYING'
      );
    }

    for (const act of recentActivity) {
      const game =
        act.userGame?.game || act.review?.game || act.favorite?.game || null;
      const playtime = act.userGame?.playtimeMinutes || 0;
      touch(
        game,
        act.userId,
        friendLabel(act.user.username, act.user.name),
        playtime,
        act.type === 'TRACKING'
      );
    }

    const ranked = [...byGame.values()]
      .map((row) => {
        const friendCount = row.friendKeys.size;
        let playtimeMinutes = 0;
        for (const m of row.playtimeByFriend.values()) playtimeMinutes += m;
        const score =
          friendCount * 100 +
          row.playingBoost * 40 +
          Math.min(80, Math.log10((playtimeMinutes || 1) + 1) * 25);
        const names = row.friendNames.join(', ');
        const hours =
          playtimeMinutes > 0 ? ` · ${formatHours(playtimeMinutes)} logged` : '';
        const reason =
          friendCount === 1
            ? `${names}${hours}`
            : `${friendCount} friends · ${names}${hours}`;
        return {
          id: row.game.id,
          name: row.game.name,
          slug: row.game.slug,
          coverUrl: row.game.coverImage,
          genres: row.game.genres.map((g) => g.genre),
          rating: row.game.avgRating || 0,
          score,
          reason,
        } satisfies PopularWithFriendsGame;
      })
      .sort((a, b) => b.score - a.score || b.rating - a.rating)
      .slice(0, LIMIT);

    return ranked;
  } catch (error) {
    console.error('Popular with friends failed:', error);
    return [];
  }
}
