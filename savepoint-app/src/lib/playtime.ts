import { prisma } from '@/lib/db';

/** Recompute denormalized community playtime averages for the given games. */
export async function recomputePlaytimeAverages(gameIds: string[]) {
  const unique = [...new Set(gameIds.filter(Boolean))];
  if (unique.length === 0) return;

  const stats = await prisma.userGame.groupBy({
    by: ['gameId'],
    where: {
      gameId: { in: unique },
      playtimeMinutes: { gt: 0 },
      source: { in: ['STEAM', 'XBOX', 'PSN'] },
    },
    _avg: { playtimeMinutes: true },
    _count: { _all: true },
  });

  const byId = new Map(stats.map((s) => [s.gameId, s]));

  await Promise.all(
    unique.map((gameId) => {
      const row = byId.get(gameId);
      return prisma.game.update({
        where: { id: gameId },
        data: {
          avgPlaytimeMinutes: row?._avg.playtimeMinutes ?? 0,
          playtimeSampleCount: row?._count._all ?? 0,
        },
      });
    })
  );
}

export function formatPlaytimeHours(minutes: number | null | undefined): string | null {
  const m = minutes || 0;
  if (m <= 0) return null;
  const hours = m / 60;
  if (hours < 1) return `${Math.round(m)}m`;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}
