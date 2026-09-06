import { fetchIGDB, fetchIGDBFresh } from '@/lib/igdb';
import { prisma } from '@/lib/db';

/** IGDB external_games.category for Steam storefront */
export const IGDB_EXTERNAL_STEAM = 1;

/**
 * Map Steam app id → IGDB game id (numeric). Caches steamAppId on existing local rows.
 */
export async function resolveIgdbIdFromSteamAppId(steamAppId: number): Promise<number | null> {
  const cached = await prisma.game.findUnique({
    where: { steamAppId },
    select: { igdbId: true, id: true },
  });
  if (cached?.igdbId) return cached.igdbId;
  if (cached?.id && /^\d+$/.test(cached.id)) return parseInt(cached.id, 10);

  const external = await fetchIGDBFresh(
    'external_games',
    `
    fields game, uid, category;
    where category = ${IGDB_EXTERNAL_STEAM} & uid = "${steamAppId}";
    limit 1;
    `
  );

  const igdbGameId = external?.[0]?.game;
  if (typeof igdbGameId !== 'number') return null;
  return igdbGameId;
}

/**
 * Best-effort name search against IGDB for Xbox titles.
 */
export async function resolveIgdbIdFromName(name: string): Promise<number | null> {
  const cleaned = name.replace(/"/g, '').trim();
  if (cleaned.length < 2) return null;

  const results = await fetchIGDB(
    'games',
    `
    search "${cleaned}";
    fields name, slug;
    where category = 0;
    limit 5;
    `
  );

  if (!Array.isArray(results) || results.length === 0) return null;

  const lower = cleaned.toLowerCase();
  const exact = results.find((g: { name?: string }) => g.name?.toLowerCase() === lower) || results[0];
  if (!exact?.id) return null;
  return exact.id as number;
}
