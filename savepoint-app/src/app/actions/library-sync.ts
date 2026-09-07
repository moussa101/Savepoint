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
import {
  fetchIGDBTimeToBeats,
  finishMinutesFromTimeToBeat,
} from '@/lib/igdb';
import { fetchXboxTitleHistory, resolveXboxGamertag } from '@/lib/xbox';
import { recomputePlaytimeAverages } from '@/lib/playtime';
import { reconcileUserXp } from '@/lib/gamification';
import {
  cleanPsnGameName,
  exchangeNpssoForTokens,
  fetchMergedTrophiesForTitle,
  fetchPsnAccountProfile,
  fetchPsnOwnedCatalog,
  fetchPsnPlayedGames,
  fetchPsnTrophyTitles,
  getValidPsnAuthorization,
  PsnApiError,
  tokenPersistFields,
} from '@/lib/psn';

const STEAM_SYNC_LIMIT = 500;
const XBOX_SYNC_LIMIT = 150;
const PSN_SYNC_LIMIT = 800;
const PSN_TROPHY_DETAIL_LIMIT = 40;

type ImportStatus = 'WANT_TO_PLAY' | 'PLAYING' | 'COMPLETED';

/**
 * Shelf hint from sync: trophies / achievements win, otherwise playtime vs
 * IGDB main-story finish time marks Completed.
 */
function inferImportStatus(opts: {
  playtimeMinutes: number;
  finishMinutes?: number | null;
  trophyHint?: 'PLAYING' | 'COMPLETED' | null;
}): ImportStatus {
  if (opts.trophyHint === 'COMPLETED') return 'COMPLETED';
  const finish = opts.finishMinutes;
  if (
    finish != null &&
    finish > 0 &&
    opts.playtimeMinutes > 0 &&
    opts.playtimeMinutes >= finish
  ) {
    return 'COMPLETED';
  }
  if (opts.trophyHint === 'PLAYING' || opts.playtimeMinutes > 0) return 'PLAYING';
  return 'WANT_TO_PLAY';
}

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
  source: 'STEAM' | 'XBOX' | 'PSN';
  /** Shelf hint from platform sync. Never downgrades COMPLETED or changes DROPPED. */
  suggestedStatus?: ImportStatus;
  /** IGDB main-story finish estimate (minutes); used when suggestedStatus omitted. */
  finishMinutes?: number | null;
}) {
  const existing = await prisma.userGame.findUnique({
    where: {
      userId_gameId: { userId: opts.userId, gameId: opts.gameId },
    },
  });

  const incoming =
    opts.suggestedStatus ||
    inferImportStatus({
      playtimeMinutes: opts.playtimeMinutes,
      finishMinutes: opts.finishMinutes,
    });

  if (existing) {
    let nextStatus = existing.status;
    // Preserve user choices: never touch DROPPED; never downgrade COMPLETED.
    if (existing.status !== 'DROPPED' && existing.status !== 'COMPLETED') {
      if (incoming === 'COMPLETED') nextStatus = 'COMPLETED';
      else if (existing.status === 'WANT_TO_PLAY' && incoming === 'PLAYING') nextStatus = 'PLAYING';
    }

    await prisma.userGame.update({
      where: { id: existing.id },
      data: {
        playtimeMinutes: Math.max(existing.playtimeMinutes || 0, opts.playtimeMinutes),
        source: existing.source === 'MANUAL' ? opts.source : existing.source || opts.source,
        status: nextStatus,
        lastSyncedAt: new Date(),
      },
    });
    return { result: 'updated' as const, status: nextStatus };
  }

  await prisma.userGame.create({
    data: {
      userId: opts.userId,
      gameId: opts.gameId,
      status: incoming,
      playtimeMinutes: opts.playtimeMinutes,
      source: opts.source,
      lastSyncedAt: new Date(),
    },
  });
  return { result: 'created' as const, status: incoming };
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
 * Steam library import for a known user id (used by the signed-in action and
 * by auto-sync after linking / stale Library visits).
 */
export async function syncSteamLibraryForUser(userId: string) {
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
    // Mark Completed when playtime meets IGDB main-story finish time.
    const targets: Array<{ gameId: string; igdbId: number; playtimeMinutes: number }> = [];
    const seen = new Set<string>();
    for (const [appId, igdbId] of igdbByAppId) {
      const gameId = localIdByIgdb.get(igdbId);
      if (!gameId || seen.has(gameId)) continue;
      seen.add(gameId);
      targets.push({
        gameId,
        igdbId,
        playtimeMinutes: playtimeByAppId.get(appId) ?? 0,
      });
    }

    const ttbByIgdb = await fetchIGDBTimeToBeats(targets.map((t) => t.igdbId));
    const finishByGame = new Map(
      targets.map((t) => [
        t.gameId,
        finishMinutesFromTimeToBeat(ttbByIgdb.get(t.igdbId)),
      ])
    );

    const existingUserGames = await prisma.userGame.findMany({
      where: { userId, gameId: { in: targets.map((t) => t.gameId) } },
      select: { id: true, gameId: true, playtimeMinutes: true, source: true, status: true },
    });
    const existingByGame = new Map(existingUserGames.map((ug) => [ug.gameId, ug]));
    const now = new Date();

    let markedCompleted = 0;

    const toCreate = targets.filter((t) => !existingByGame.has(t.gameId));
    if (toCreate.length > 0) {
      await prisma.userGame.createMany({
        data: toCreate.map((t) => {
          const status = inferImportStatus({
            playtimeMinutes: t.playtimeMinutes,
            finishMinutes: finishByGame.get(t.gameId),
          });
          if (status === 'COMPLETED') markedCompleted += 1;
          return {
            userId,
            gameId: t.gameId,
            status,
            playtimeMinutes: t.playtimeMinutes,
            source: 'STEAM',
            lastSyncedAt: now,
          };
        }),
        skipDuplicates: true,
      });
    }

    const toTouch = targets.filter((t) => existingByGame.has(t.gameId));
    let updated = 0;
    await mapConcurrent(toTouch, 10, async (t) => {
      const ug = existingByGame.get(t.gameId)!;
      const playtime = Math.max(ug.playtimeMinutes || 0, t.playtimeMinutes);
      const suggested = inferImportStatus({
        playtimeMinutes: playtime,
        finishMinutes: finishByGame.get(t.gameId),
      });
      let nextStatus = ug.status;
      if (ug.status !== 'DROPPED' && ug.status !== 'COMPLETED') {
        if (suggested === 'COMPLETED') nextStatus = 'COMPLETED';
        else if (ug.status === 'WANT_TO_PLAY' && suggested === 'PLAYING') nextStatus = 'PLAYING';
      }
      const playtimeChanged = playtime > (ug.playtimeMinutes || 0);
      const statusChanged = nextStatus !== ug.status;
      if (!playtimeChanged && !statusChanged && ug.source !== 'MANUAL' && ug.source) return;
      if (statusChanged && nextStatus === 'COMPLETED') markedCompleted += 1;
      updated += 1;
      await prisma.userGame.update({
        where: { id: ug.id },
        data: {
          playtimeMinutes: playtime,
          source: ug.source === 'MANUAL' || !ug.source ? 'STEAM' : ug.source,
          status: nextStatus,
          lastSyncedAt: now,
        },
      });
    });

    await prisma.user.update({
      where: { id: userId },
      data: { steamLastSyncAt: now },
    });

    // 7. Refresh community average playtime for every game we touched.
    await recomputePlaytimeAverages(targets.map((t) => t.gameId));

    const xp = await reconcileUserXp(userId);

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath('/profile', 'layout');

    return {
      success: true as const,
      imported: toCreate.length,
      updated,
      skipped,
      total: batch.length,
      markedCompleted,
      xpGained: xp.gained,
      xp: xp.xp,
    };
  } catch (error) {
    console.error('Steam sync failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Steam sync failed',
    };
  }
}

export async function syncSteamLibrary() {
  const userId = await requireUserId();
  return syncSteamLibraryForUser(userId);
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
    let markedCompleted = 0;

    const resolved: Array<{
      localId: string;
      igdbId: number;
      playtimeMinutes: number;
    }> = [];

    for (const title of batch) {
      try {
        const igdbId = await resolveIgdbIdFromName(title.name);
        if (!igdbId) {
          skipped += 1;
          continue;
        }

        const localId = await ensureGameExistsLocally(String(igdbId));
        resolved.push({
          localId,
          igdbId,
          playtimeMinutes: title.playtimeMinutes,
        });
      } catch (err) {
        console.error('Xbox title sync item failed', title.name, err);
        skipped += 1;
      }
    }

    const ttbByIgdb = await fetchIGDBTimeToBeats(resolved.map((r) => r.igdbId));

    for (const row of resolved) {
      const finishMinutes = finishMinutesFromTimeToBeat(ttbByIgdb.get(row.igdbId));
      const result = await upsertImportedUserGame({
        userId,
        gameId: row.localId,
        playtimeMinutes: row.playtimeMinutes,
        source: 'XBOX',
        finishMinutes,
      });
      if (result.result === 'created') imported += 1;
      else updated += 1;
      if (result.status === 'COMPLETED') markedCompleted += 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { xboxLastSyncAt: new Date() },
    });

    // Refresh community averages for titles we just wrote.
    // (Xbox sync is per-title; collect game ids from this user's Xbox rows.)
    const xboxGames = await prisma.userGame.findMany({
      where: { userId, source: 'XBOX' },
      select: { gameId: true },
      take: XBOX_SYNC_LIMIT,
    });
    await recomputePlaytimeAverages(xboxGames.map((g) => g.gameId));

    const xp = await reconcileUserXp(userId);

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath('/profile', 'layout');

    return {
      success: true,
      imported,
      updated,
      skipped,
      total: batch.length,
      markedCompleted,
      xpGained: xp.gained,
      xp: xp.xp,
    };
  } catch (error) {
    console.error('Xbox sync failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Xbox sync failed',
    };
  }
}

export async function linkPsnNpsso(formData: FormData) {
  const userId = await requireUserId();
  const cleaned = String(formData.get('npsso') || '').trim();
  if (!cleaned) return { error: 'Paste your NPSSO token from PlayStation.' };

  try {
    const tokens = await exchangeNpssoForTokens(cleaned);
    const authorization = { accessToken: tokens.accessToken };
    const profile = await fetchPsnAccountProfile(authorization);

    const taken = await prisma.user.findFirst({
      where: { psnAccountId: profile.accountId, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return { error: 'That PlayStation account is already linked to another Savepoint user.' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        psnAccountId: profile.accountId,
        psnOnlineId: profile.onlineId,
        psnLinkedAt: new Date(),
        psnTrophyLevel: profile.trophyLevel,
        psnTrophyTier: profile.trophyTier,
        psnTrophyProgress: profile.trophyProgress,
        psnEarnedBronze: profile.earnedBronze,
        psnEarnedSilver: profile.earnedSilver,
        psnEarnedGold: profile.earnedGold,
        psnEarnedPlatinum: profile.earnedPlatinum,
        ...tokenPersistFields(tokens),
      },
    });

    // Import library right after linking (best-effort — sync can also be run manually).
    const syncResult = await syncPsnLibraryForUser(userId);

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath('/profile', 'layout');

    if (syncResult && 'error' in syncResult && syncResult.error) {
      return {
        success: true,
        onlineId: profile.onlineId,
        warning: `Linked as ${profile.onlineId}, but library sync failed: ${syncResult.error}`,
      };
    }

    return {
      success: true,
      onlineId: profile.onlineId,
      imported: 'imported' in syncResult ? syncResult.imported : undefined,
      updated: 'updated' in syncResult ? syncResult.updated : undefined,
      skipped: 'skipped' in syncResult ? syncResult.skipped : undefined,
    };
  } catch (error) {
    console.error('PSN link failed:', error instanceof Error ? error.message : error);
    return {
      error: error instanceof Error ? error.message : 'Failed to link PlayStation',
    };
  }
}

export async function unlinkPsn() {
  const userId = await requireUserId();
  await prisma.$transaction([
    prisma.psnTrophy.deleteMany({ where: { userId } }),
    prisma.psnTitleProgress.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        psnAccountId: null,
        psnOnlineId: null,
        psnRefreshToken: null,
        psnAccessToken: null,
        psnTokenExpiresAt: null,
        psnLinkedAt: null,
        psnLastSyncAt: null,
        psnTrophyLevel: null,
        psnTrophyTier: null,
        psnTrophyProgress: null,
        psnEarnedBronze: 0,
        psnEarnedSilver: 0,
        psnEarnedGold: 0,
        psnEarnedPlatinum: 0,
      },
    }),
  ]);
  revalidatePath('/settings');
  revalidatePath('/library');
  revalidatePath('/profile', 'layout');
  return { success: true };
}

async function upsertPsnTitleProgress(
  userId: string,
  title: Awaited<ReturnType<typeof fetchPsnTrophyTitles>>[number],
  gameId: string | null
) {
  await prisma.psnTitleProgress.upsert({
    where: {
      userId_npCommunicationId: {
        userId,
        npCommunicationId: title.npCommunicationId,
      },
    },
    create: {
      userId,
      gameId,
      npCommunicationId: title.npCommunicationId,
      npServiceName: title.npServiceName,
      titleName: cleanPsnGameName(title.trophyTitleName),
      platform: String(title.trophyTitlePlatform || ''),
      progress: title.progress || 0,
      earnedBronze: title.earnedTrophies.bronze,
      earnedSilver: title.earnedTrophies.silver,
      earnedGold: title.earnedTrophies.gold,
      earnedPlatinum: title.earnedTrophies.platinum,
      definedBronze: title.definedTrophies.bronze,
      definedSilver: title.definedTrophies.silver,
      definedGold: title.definedTrophies.gold,
      definedPlatinum: title.definedTrophies.platinum,
      iconUrl: title.trophyTitleIconUrl || null,
      lastUpdatedAt: title.lastUpdatedDateTime ? new Date(title.lastUpdatedDateTime) : null,
    },
    update: {
      gameId: gameId ?? undefined,
      npServiceName: title.npServiceName,
      titleName: cleanPsnGameName(title.trophyTitleName),
      platform: String(title.trophyTitlePlatform || ''),
      progress: title.progress || 0,
      earnedBronze: title.earnedTrophies.bronze,
      earnedSilver: title.earnedTrophies.silver,
      earnedGold: title.earnedTrophies.gold,
      earnedPlatinum: title.earnedTrophies.platinum,
      definedBronze: title.definedTrophies.bronze,
      definedSilver: title.definedTrophies.silver,
      definedGold: title.definedTrophies.gold,
      definedPlatinum: title.definedTrophies.platinum,
      iconUrl: title.trophyTitleIconUrl || null,
      lastUpdatedAt: title.lastUpdatedDateTime ? new Date(title.lastUpdatedDateTime) : null,
    },
  });
}

async function persistMergedTrophies(
  userId: string,
  npCommunicationId: string,
  trophies: Awaited<ReturnType<typeof fetchMergedTrophiesForTitle>>
) {
  for (const t of trophies) {
    await prisma.psnTrophy.upsert({
      where: {
        userId_npCommunicationId_trophyId: {
          userId,
          npCommunicationId,
          trophyId: t.trophyId,
        },
      },
      create: {
        userId,
        npCommunicationId,
        trophyId: t.trophyId,
        trophyName: t.trophyName,
        trophyDetail: t.trophyDetail,
        trophyType: t.trophyType,
        trophyIconUrl: t.trophyIconUrl,
        trophyGroupId: t.trophyGroupId,
        earned: t.earned,
        earnedDateTime: t.earnedDateTime,
        rarity: t.rarity,
        earnedRate: t.earnedRate,
      },
      update: {
        trophyName: t.trophyName,
        trophyDetail: t.trophyDetail,
        trophyType: t.trophyType,
        trophyIconUrl: t.trophyIconUrl,
        trophyGroupId: t.trophyGroupId,
        earned: t.earned,
        earnedDateTime: t.earnedDateTime,
        rarity: t.rarity,
        earnedRate: t.earnedRate,
      },
    });
  }
}

export async function syncPsnLibraryForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { psnAccountId: true, psnOnlineId: true },
  });
  if (!user?.psnAccountId) {
    return { error: 'Connect PlayStation first.' };
  }

  try {
    const authorization = await getValidPsnAuthorization(userId);
    const accountId = user.psnAccountId;

    // Fetch independently so one Sony endpoint timeout doesn't abort the whole sync.
    let profile: Awaited<ReturnType<typeof fetchPsnAccountProfile>> | null = null;
    let played: Awaited<ReturnType<typeof fetchPsnPlayedGames>> = [];
    let ownedCatalog: Awaited<ReturnType<typeof fetchPsnOwnedCatalog>> = [];
    let trophyTitles: Awaited<ReturnType<typeof fetchPsnTrophyTitles>> = [];
    const fetchWarnings: string[] = [];

    try {
      profile = await fetchPsnAccountProfile(authorization, accountId);
    } catch (err) {
      console.error('PSN profile fetch failed', err);
      fetchWarnings.push('profile');
    }

    const resolvedAccountId = profile?.accountId || accountId;

    try {
      played = await fetchPsnPlayedGames(authorization, resolvedAccountId, PSN_SYNC_LIMIT);
    } catch (err) {
      console.error('PSN played-games fetch failed', err);
      fetchWarnings.push('played games');
    }
    try {
      // Purchased + recently played often has the full library; trophy APIs only
      // return titles that have synced trophy data (can be a tiny subset).
      ownedCatalog = await fetchPsnOwnedCatalog(authorization, PSN_SYNC_LIMIT);
    } catch (err) {
      console.error('PSN owned catalog fetch failed', err);
      fetchWarnings.push('owned games');
    }
    try {
      trophyTitles = await fetchPsnTrophyTitles(authorization, resolvedAccountId, PSN_SYNC_LIMIT);
    } catch (err) {
      console.error('PSN trophy-titles fetch failed', err);
      fetchWarnings.push('trophy list');
    }

    if (!played.length && !ownedCatalog.length && !trophyTitles.length) {
      return {
        error:
          fetchWarnings.length > 0
            ? `PlayStation sync failed (${fetchWarnings.join(', ')}). Try again in a minute.`
            : 'No PlayStation games found. Check that game activity / trophy sharing is visible on your PSN account.',
      };
    }

    const nameToGameId = new Map<string, string>();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const touchedGameIds: string[] = [];

    const playtimeByName = new Map<string, number>();
    for (const title of played) {
      playtimeByName.set(title.name.toLowerCase(), title.playtimeMinutes);
    }

    // Merge owned catalog + trophy titles + played list for library coverage.
    const importNames = new Map<string, { name: string; playtimeMinutes: number }>();
    for (const title of ownedCatalog) {
      const key = title.name.toLowerCase();
      importNames.set(key, {
        name: title.name,
        playtimeMinutes: playtimeByName.get(key) || 0,
      });
    }
    for (const title of trophyTitles) {
      const name = cleanPsnGameName(title.trophyTitleName);
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      const existing = importNames.get(key);
      importNames.set(key, {
        name,
        playtimeMinutes: existing?.playtimeMinutes || playtimeByName.get(key) || 0,
      });
    }
    for (const title of played) {
      const key = title.name.toLowerCase();
      const existing = importNames.get(key);
      importNames.set(key, {
        name: title.name,
        playtimeMinutes: Math.max(existing?.playtimeMinutes || 0, title.playtimeMinutes),
      });
    }

    // Trophy progress → shelf hints (100% or platinum ⇒ Completed).
    const statusByName = new Map<string, 'PLAYING' | 'COMPLETED'>();
    for (const title of trophyTitles) {
      const key = cleanPsnGameName(title.trophyTitleName).toLowerCase();
      if (key.length < 2) continue;
      const earnedCount =
        (title.earnedTrophies?.bronze || 0) +
        (title.earnedTrophies?.silver || 0) +
        (title.earnedTrophies?.gold || 0) +
        (title.earnedTrophies?.platinum || 0);
      const completed =
        (title.progress || 0) >= 100 || (title.earnedTrophies?.platinum || 0) > 0;
      if (completed) statusByName.set(key, 'COMPLETED');
      else if (earnedCount > 0 || (title.progress || 0) > 0) statusByName.set(key, 'PLAYING');
    }

    const importBatch = [...importNames.values()]
      .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
      .slice(0, PSN_SYNC_LIMIT);

    let markedCompleted = 0;

    const resolved: Array<{
      name: string;
      localId: string;
      igdbId: number;
      playtimeMinutes: number;
      trophyHint: 'PLAYING' | 'COMPLETED' | null;
    }> = [];

    for (const title of importBatch) {
      try {
        const igdbId = await resolveIgdbIdFromName(title.name);
        if (!igdbId) {
          skipped += 1;
          continue;
        }
        const localId = await ensureGameExistsLocally(String(igdbId));
        nameToGameId.set(title.name.toLowerCase(), localId);
        resolved.push({
          name: title.name,
          localId,
          igdbId,
          playtimeMinutes: title.playtimeMinutes,
          trophyHint: statusByName.get(title.name.toLowerCase()) || null,
        });
      } catch (err) {
        console.error('PSN title sync item failed', title.name, err);
        skipped += 1;
      }
    }

    const ttbByIgdb = await fetchIGDBTimeToBeats(resolved.map((r) => r.igdbId));

    for (const row of resolved) {
      const suggestedStatus = inferImportStatus({
        playtimeMinutes: row.playtimeMinutes,
        finishMinutes: finishMinutesFromTimeToBeat(ttbByIgdb.get(row.igdbId)),
        trophyHint: row.trophyHint,
      });
      const result = await upsertImportedUserGame({
        userId,
        gameId: row.localId,
        playtimeMinutes: row.playtimeMinutes,
        source: 'PSN',
        suggestedStatus,
      });
      if (result.result === 'created') imported += 1;
      else updated += 1;
      if (suggestedStatus === 'COMPLETED') markedCompleted += 1;
      touchedGameIds.push(row.localId);
    }

    for (const title of trophyTitles) {
      const cleaned = cleanPsnGameName(title.trophyTitleName);
      let gameId = nameToGameId.get(cleaned.toLowerCase()) || null;
      if (!gameId) {
        try {
          const igdbId = await resolveIgdbIdFromName(cleaned);
          if (igdbId) {
            gameId = await ensureGameExistsLocally(String(igdbId));
            nameToGameId.set(cleaned.toLowerCase(), gameId);
          }
        } catch {
          /* name match is best-effort */
        }
      }
      await upsertPsnTitleProgress(userId, title, gameId);
    }

    const detailCandidates = trophyTitles
      .filter((t) => (t.progress || 0) > 0)
      .slice(0, PSN_TROPHY_DETAIL_LIMIT);

    for (const title of detailCandidates) {
      try {
        const merged = await fetchMergedTrophiesForTitle(authorization, title, resolvedAccountId);
        await persistMergedTrophies(userId, title.npCommunicationId, merged);
      } catch (err) {
        console.error('PSN trophy detail sync failed', title.npCommunicationId, err);
      }
    }

    // If profile summary looks empty, fall back to summing synced title progress.
    let earnedBronze = profile?.earnedBronze ?? 0;
    let earnedSilver = profile?.earnedSilver ?? 0;
    let earnedGold = profile?.earnedGold ?? 0;
    let earnedPlatinum = profile?.earnedPlatinum ?? 0;
    let trophyLevel = profile?.trophyLevel ?? null;
    let trophyTier = profile?.trophyTier ?? null;
    let trophyProgress = profile?.trophyProgress ?? null;

    if (earnedBronze + earnedSilver + earnedGold + earnedPlatinum === 0 && trophyTitles.length > 0) {
      earnedBronze = trophyTitles.reduce((s, t) => s + (t.earnedTrophies?.bronze || 0), 0);
      earnedSilver = trophyTitles.reduce((s, t) => s + (t.earnedTrophies?.silver || 0), 0);
      earnedGold = trophyTitles.reduce((s, t) => s + (t.earnedTrophies?.gold || 0), 0);
      earnedPlatinum = trophyTitles.reduce((s, t) => s + (t.earnedTrophies?.platinum || 0), 0);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        psnLastSyncAt: new Date(),
        psnAccountId: resolvedAccountId,
        ...(profile?.onlineId ? { psnOnlineId: profile.onlineId } : {}),
        psnTrophyLevel: trophyLevel,
        psnTrophyTier: trophyTier,
        psnTrophyProgress: trophyProgress,
        psnEarnedBronze: earnedBronze,
        psnEarnedSilver: earnedSilver,
        psnEarnedGold: earnedGold,
        psnEarnedPlatinum: earnedPlatinum,
      },
    });

    await recomputePlaytimeAverages(touchedGameIds);

    const xp = await reconcileUserXp(userId);

    revalidatePath('/settings');
    revalidatePath('/library');
    revalidatePath('/profile', 'layout');
    revalidatePath('/games', 'layout');

    return {
      success: true as const,
      imported,
      updated,
      skipped,
      total: importBatch.length,
      trophyTitles: trophyTitles.length,
      xpGained: xp.gained,
      xp: xp.xp,
      warning:
        fetchWarnings.length > 0
          ? `Partial sync — could not load: ${fetchWarnings.join(', ')}`
          : trophyTitles.length <= 2 && importBatch.length > trophyTitles.length
            ? `Imported ${importBatch.length} games from your PSN library. Sony only reported ${trophyTitles.length} trophy title(s) for this account (level ${trophyLevel ?? 1}).`
            : markedCompleted > 0
              ? `Marked ${markedCompleted} game(s) Completed from trophies or playtime vs story length.`
              : undefined,
    };
  } catch (error) {
    console.error('PSN sync failed:', error);
    const message =
      error instanceof PsnApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'PlayStation sync failed';
    return { error: message };
  }
}

export async function syncPsnLibrary() {
  const userId = await requireUserId();
  return syncPsnLibraryForUser(userId);
}

/** Lazy-load detailed trophies for a Savepoint game the user has PSN progress on. */
export async function syncPsnTrophiesForGame(gameId: string) {
  const userId = await requireUserId();

  const [progress, user] = await Promise.all([
    prisma.psnTitleProgress.findFirst({
      where: { userId, gameId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { psnAccountId: true },
    }),
  ]);
  if (!progress) {
    return { error: 'No PlayStation trophy data for this game yet. Sync your PSN library first.' };
  }

  try {
    const authorization = await getValidPsnAuthorization(userId);
    const merged = await fetchMergedTrophiesForTitle(
      authorization,
      {
        npCommunicationId: progress.npCommunicationId,
        trophyTitlePlatform: progress.platform || '',
        npServiceName: (progress.npServiceName === 'trophy2' ? 'trophy2' : 'trophy') as
          | 'trophy'
          | 'trophy2',
      },
      user?.psnAccountId || 'me'
    );
    await persistMergedTrophies(userId, progress.npCommunicationId, merged);
    revalidatePath(`/games`);
    return { success: true, count: merged.length };
  } catch (error) {
    console.error('PSN per-game trophy sync failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to load trophies for this game',
    };
  }
}
