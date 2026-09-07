import { prisma } from '@/lib/db';
import { isGameReleased } from '@/lib/game-release';

/** Notify watchers for one game if it has released and they haven't been notified yet. */
export async function notifyReleaseWatchersForGame(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, releaseDate: true, name: true },
  });
  if (!game || !isGameReleased(game.releaseDate)) return 0;

  const watches = await prisma.gameReleaseWatch.findMany({
    where: { gameId, notifiedAt: null },
    select: {
      id: true,
      userId: true,
      user: { select: { notifyOnGameRelease: true } },
    },
  });
  if (watches.length === 0) return 0;

  const now = new Date();
  const eligible = watches.filter((w) => w.user.notifyOnGameRelease !== false);

  if (eligible.length > 0) {
    await prisma.notification.createMany({
      data: eligible.map((w) => ({
        userId: w.userId,
        type: 'GAME_RELEASED',
        gameId,
      })),
    });
  }

  await prisma.gameReleaseWatch.updateMany({
    where: { id: { in: watches.map((w) => w.id) } },
    data: { notifiedAt: now },
  });

  return eligible.length;
}

/** Sweep recently-released games that still have pending watches. */
export async function notifyPendingReleaseWatches(limit = 50) {
  const now = new Date();
  const pending = await prisma.gameReleaseWatch.findMany({
    where: {
      notifiedAt: null,
      game: { releaseDate: { lte: now } },
    },
    select: { gameId: true },
    distinct: ['gameId'],
    take: limit,
  });

  let total = 0;
  for (const row of pending) {
    total += await notifyReleaseWatchersForGame(row.gameId);
  }
  return total;
}
