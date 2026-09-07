'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { ensureGameExistsLocally } from '@/app/actions/games';
import { fetchSteamOwnedGames } from '@/lib/steam';
import {
  fetchIGDBGamesByIds,
  resolveIgdbIdFromName,
  resolveIgdbIdsFromSteamAppIds,
  toLocalGameRow,
} from '@/lib/igdb-external';
import { fetchXboxTitleHistory, resolveXboxGamertag } from '@/lib/xbox';

const STEAM_SYNC_LIMIT = 500;
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

/** Run async work over `items` with bounded concurrency (keeps DB connections sane). */
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Steam library import. Everything is done in batches — a few IGDB requests
 * and a handful of database round-trips regardless of library size — so a
 * 500-game library syncs in seconds rather than minutes.
 */
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
    // 1. Owned games from Steam, most-played first.
    const owned = await fetchSteamOwnedGames(user.steamId);
    const batch = [...owned]
      .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
      .slice(0, STEAM_SYNC_LIMIT);
    const playtimeByAppId = new Map(batch.map((g) => [g.appid, g.playtime_forever || 0]));

    // 2. Steam app id → IGDB id (local cache first, then IGDB in chunks).
    const igdbByAppId = await resolveIgdbIdsFromSteamAppIds(batch.map((g) => g.appid));
    const skipped = batch.length - igdbByAppId.size;

    const igdbIds = [...new Set(igdbByAppId.values())];
    if (igdbIds.length === 0) {
      await prisma.user.update({ where: { id: userId }, data: { steamLastSyncAt: new Date() } });
      revalidatePath('/settings');
      revalidatePath('/library');
      return { success: true, imported: 0, updated: 0, skipped, total: batch.length };
    }

    // 3. Which of those games already exist locally?
    const idStrings = igdbIds.map(String);
    const existingGames = await prisma.game.findMany({
      where: { OR: [{ igdbId: { in: igdbIds } }, { id: { in: idStrings } }] },
      select: { id: true, igdbId: true, steamAppId: true },
    });
    const localIdByIgdb = new Map<number, string>();
    for (const g of existingGames) {
      const key = g.igdbId ?? parseInt(g.id, 10);
      if (Number.isInteger(key)) localIdByIgdb.set(key, g.id);
    }

    // 4. Create missing games (plus genres/platforms) from IGDB in bulk.
    const missingIgdbIds = igdbIds.filter((id) => !localIdByIgdb.has(id));
    if (missingIgdbIds.length > 0) {
      const details = await fetchIGDBGamesByIds(missingIgdbIds);
      const rows = details.map(toLocalGameRow);

      await prisma.game.createMany({
        data: rows.map(({ genres: _g, platforms: _p, ...row }) => row),
        skipDuplicates: true,
      });

      // Re-read so slug/id collisions resolve to whatever row actually exists.
      const created = await prisma.game.findMany({
        where: { OR: [{ igdbId: { in: missingIgdbIds } }, { slug: { in: rows.map((r) => r.slug) } }] },
        select: { id: true, igdbId: true, slug: true },
      });
      const createdIds = new Set<string>();
      for (const g of created) {
        const row = rows.find((r) => r.igdbId === g.igdbId || r.slug === g.slug);
        if (row) {
          localIdByIgdb.set(row.igdbId, g.id);
          createdIds.add(g.id);
        }
      }

      const genreRows = rows.flatMap((r) => {
        const gameId = localIdByIgdb.get(r.igdbId);
        return gameId && createdIds.has(gameId) ? r.genres.map((genre) => ({ gameId, genre })) : [];
      });
      const platformRows = rows.flatMap((r) => {
        const gameId = localIdByIgdb.get(r.igdbId);
        return gameId && createdIds.has(gameId) ? r.platforms.map((platform) => ({ gameId, platform })) : [];
      });
      await Promise.all([
        genreRows.length ? prisma.gameGenre.createMany({ data: genreRows, skipDuplicates: true }) : null,
        platformRows.length ? prisma.gamePlatform.createMany({ data: platformRows, skipDuplicates: true }) : null,
      ]);
    }

    // 5. Remember Steam app ids on local rows so future syncs skip IGDB entirely.
    const knownSteamApp = new Map(existingGames.map((g) => [g.id, g.steamAppId]));
    const appIdUpdates: Array<{ gameId: string; appId: number }> = [];
    for (const [appId, igdbId] of igdbByAppId) {
      const gameId = localIdByIgdb.get(igdbId);
      if (gameId && knownSteamApp.get(gameId) !== appId) appIdUpdates.push({ gameId, appId });
    }
    await mapConcurrent(appIdUpdates, 10, ({ gameId, appId }) =>
      prisma.game
        .update({ where: { id: gameId }, data: { steamAppId: appId } })
        .catch(() => null) // another row may already own this app id
    );

    // 6. Upsert the user's shelf entries in bulk.
    const targets: Array<{ gameId: string; playtimeMinutes: number }> = [];
    const seen = new Set<string>();
    for (const [appId, igdbId] of igdbByAppId) {
      const gameId = localIdByIgdb.get(igdbId);
      if (!gameId || seen.has(gameId)) continue;
      seen.add(gameId);
      targets.push({ gameId, playtimeMinutes: playtimeByAppId.get(appId) ?? 0 });
    }

    const existingUserGames = await prisma.userGame.findMany({
      where: { userId, gameId: { in: targets.map((t) => t.gameId) } },
      select: { id: true, gameId: true, playtimeMinutes: true, source: true },
    });
    const existingByGame = new Map(existingUserGames.map((ug) => [ug.gameId, ug]));
    const now = new Date();

    const toCreate = targets.filter((t) => !existingByGame.has(t.gameId));
    if (toCreate.length > 0) {
      await prisma.userGame.createMany({
        data: toCreate.map((t) => ({
          userId,
          gameId: t.gameId,
          status: t.playtimeMinutes > 0 ? 'PLAYING' : 'WANT_TO_PLAY',
          playtimeMinutes: t.playtimeMinutes,
          source: 'STEAM',
          lastSyncedAt: now,
        })),
        skipDuplicates: true,
      });
    }

    // Only touch rows whose playtime actually moved (ratings/status are never overwritten).
    const toUpdate = targets.filter((t) => {
      const ug = existingByGame.get(t.gameId);
      return ug && t.playtimeMinutes > (ug.playtimeMinutes || 0);
    });
    await mapConcurrent(toUpdate, 10, (t) => {
      const ug = existingByGame.get(t.gameId)!;
      return prisma.userGame.update({
        where: { id: ug.id },
        data: {
          playtimeMinutes: t.playtimeMinutes,
          source: ug.source === 'MANUAL' || !ug.source ? 'STEAM' : ug.source,
          lastSyncedAt: now,
        },
      });
    });

    await prisma.user.update({
      where: { id: userId },
      data: { steamLastSyncAt: now },
    });

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath('/profile', 'layout');

    return {
      success: true,
      imported: toCreate.length,
      updated: toUpdate.length,
      skipped,
      total: batch.length,
    };
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
