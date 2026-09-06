'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { ensureGameExistsLocally } from '@/app/actions/games';
import { fetchSteamOwnedGames } from '@/lib/steam';
import { resolveIgdbIdFromName, resolveIgdbIdFromSteamAppId } from '@/lib/igdb-external';
import { fetchXboxTitleHistory, resolveXboxGamertag } from '@/lib/xbox';

const STEAM_SYNC_LIMIT = 200;
const XBOX_SYNC_LIMIT = 150;

function requireUserId() {
  return auth().then((session) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user.id;
  });
}

async function upsertImportedUserGame(opts: {
  userId: string;
  gameId: string;
  playtimeMinutes: number;
  source: 'STEAM' | 'XBOX';
}) {
  const existing = await prisma.userGame.findUnique({
    where: {
      userId_gameId: { userId: opts.userId, gameId: opts.gameId },
    },
  });

  if (existing) {
    await prisma.userGame.update({
      where: { id: existing.id },
      data: {
        playtimeMinutes: Math.max(existing.playtimeMinutes || 0, opts.playtimeMinutes),
        source: existing.source === 'MANUAL' ? opts.source : existing.source || opts.source,
        lastSyncedAt: new Date(),
      },
    });
    return 'updated' as const;
  }

  await prisma.userGame.create({
    data: {
      userId: opts.userId,
      gameId: opts.gameId,
      status: opts.playtimeMinutes > 0 ? 'PLAYING' : 'WANT_TO_PLAY',
      playtimeMinutes: opts.playtimeMinutes,
      source: opts.source,
      lastSyncedAt: new Date(),
    },
  });
  return 'created' as const;
}

export async function unlinkSteam() {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      steamId: null,
      steamLinkedAt: null,
      steamLastSyncAt: null,
    },
  });
  revalidatePath('/settings');
  revalidatePath('/library');
  return { success: true };
}

export async function syncSteamLibrary() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return { error: 'Connect Steam first.' };
  }

  try {
    const owned = await fetchSteamOwnedGames(user.steamId);
    const sorted = [...owned].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
    const batch = sorted.slice(0, STEAM_SYNC_LIMIT);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const game of batch) {
      try {
        const igdbId = await resolveIgdbIdFromSteamAppId(game.appid);
        if (!igdbId) {
          skipped += 1;
          continue;
        }

        const localId = await ensureGameExistsLocally(String(igdbId));
        await prisma.game.update({
          where: { id: localId },
          data: { steamAppId: game.appid },
        }).catch(() => null);

        const result = await upsertImportedUserGame({
          userId,
          gameId: localId,
          playtimeMinutes: game.playtime_forever || 0,
          source: 'STEAM',
        });
        if (result === 'created') imported += 1;
        else updated += 1;
      } catch (err) {
        console.error('Steam game sync item failed', game.appid, err);
        skipped += 1;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { steamLastSyncAt: new Date() },
    });

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath(`/profile`);

    return { success: true, imported, updated, skipped, total: batch.length };
  } catch (error) {
    console.error('Steam sync failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Steam sync failed',
    };
  }
}

export async function linkXboxGamertag(gamertag: string) {
  const userId = await requireUserId();
  const cleaned = gamertag.trim();
  if (!cleaned) return { error: 'Enter your Xbox gamertag.' };

  try {
    const resolved = await resolveXboxGamertag(cleaned);

    const taken = await prisma.user.findFirst({
      where: { xboxXuid: resolved.xuid, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return { error: 'That Xbox account is already linked to another Savepoint user.' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        xboxGamertag: resolved.gamertag,
        xboxXuid: resolved.xuid,
        xboxLinkedAt: new Date(),
      },
    });

    revalidatePath('/settings');
    revalidatePath('/library');
    return { success: true, gamertag: resolved.gamertag };
  } catch (error) {
    console.error('Xbox link failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to link Xbox gamertag',
    };
  }
}

export async function unlinkXbox() {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      xboxGamertag: null,
      xboxXuid: null,
      xboxLinkedAt: null,
      xboxLastSyncAt: null,
    },
  });
  revalidatePath('/settings');
  revalidatePath('/library');
  return { success: true };
}

export async function syncXboxLibrary() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xboxXuid: true, xboxGamertag: true },
  });

  if (!user?.xboxXuid) {
    return { error: 'Connect Xbox first.' };
  }

  try {
    const titles = await fetchXboxTitleHistory(user.xboxXuid);
    const sorted = [...titles].sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
    const batch = sorted.slice(0, XBOX_SYNC_LIMIT);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const title of batch) {
      try {
        const igdbId = await resolveIgdbIdFromName(title.name);
        if (!igdbId) {
          skipped += 1;
          continue;
        }

        const localId = await ensureGameExistsLocally(String(igdbId));
        const result = await upsertImportedUserGame({
          userId,
          gameId: localId,
          playtimeMinutes: title.playtimeMinutes,
          source: 'XBOX',
        });
        if (result === 'created') imported += 1;
        else updated += 1;
      } catch (err) {
        console.error('Xbox title sync item failed', title.name, err);
        skipped += 1;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { xboxLastSyncAt: new Date() },
    });

    revalidatePath('/settings');
    revalidatePath('/library');

    return { success: true, imported, updated, skipped, total: batch.length };
  } catch (error) {
    console.error('Xbox sync failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Xbox sync failed',
    };
  }
}
