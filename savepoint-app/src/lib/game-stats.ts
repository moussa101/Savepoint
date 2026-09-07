import { prisma } from '@/lib/db';
import { fetchIGDBTimeToBeat } from '@/lib/igdb';
import { formatPlaytimeHours } from '@/lib/playtime';

export type GameCommunityStats = {
  plays: number;
  playing: number;
  backlogs: number;
  wishlists: number;
  ratings: number;
  lists: number;
  reviews: number;
  likes: number;
  /** IGDB "normally" — typical playthrough (minutes) */
  avgPlaytimeMinutes: number | null;
  /** IGDB "hastily" — main / rush finish (minutes) */
  finishPlaytimeMinutes: number | null;
  /** IGDB "completely" — completionist (minutes) */
  masterPlaytimeMinutes: number | null;
  /** How many HLTB/IGDB polls contributed to time-to-beat */
  timeToBeatCount: number;
};

/** Compact counts: 159000 → "159K" */
export function formatStatCount(n: number): string {
  if (!n || n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  if (n < 10_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${Math.round(n / 1_000_000)}M`;
}

function secondsToMinutes(seconds: number | null | undefined): number | null {
  if (seconds == null || seconds <= 0) return null;
  return Math.round(seconds / 60);
}

/**
 * Community shelf stats from Savepoint + finish times from IGDB game_time_to_beats.
 */
export async function getGameCommunityStats(
  gameId: string,
  igdbId: number | null | undefined
): Promise<GameCommunityStats> {
  const [statusGroups, ratings, lists, reviews, likes, wishlists, timeToBeat] = await Promise.all([
    prisma.userGame.groupBy({
      by: ['status'],
      where: { gameId },
      _count: { _all: true },
    }),
    prisma.userGame.count({ where: { gameId, rating: { not: null } } }),
    prisma.listItem.count({ where: { gameId, list: { visibility: 'PUBLIC' } } }),
    prisma.review.count({ where: { gameId } }),
    prisma.reviewLike.count({ where: { review: { gameId } } }),
    prisma.favoriteGame.count({ where: { gameId } }),
    igdbId ? fetchIGDBTimeToBeat(igdbId) : Promise.resolve(null),
  ]);

  const byStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;

  const playing = byStatus.PLAYING || 0;
  const completed = byStatus.COMPLETED || 0;
  const dropped = byStatus.DROPPED || 0;
  const want = byStatus.WANT_TO_PLAY || 0;

  return {
    plays: playing + completed + dropped,
    playing,
    backlogs: want,
    wishlists,
    ratings,
    lists,
    reviews,
    likes,
    avgPlaytimeMinutes: secondsToMinutes(timeToBeat?.normally),
    finishPlaytimeMinutes: secondsToMinutes(timeToBeat?.hastily),
    masterPlaytimeMinutes: secondsToMinutes(timeToBeat?.completely),
    timeToBeatCount: timeToBeat?.count || 0,
  };
}

export function formatStatHours(minutes: number | null | undefined): string {
  return formatPlaytimeHours(minutes) || '—';
}
