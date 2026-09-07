import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import { prisma } from '@/lib/db';

/**
 * IGDB `external_games.external_game_source` value for the Steam storefront.
 * (The older `category` field no longer matches anything and must not be used.)
 */
export const IGDB_EXTERNAL_SOURCE_STEAM = 1;

/** IGDB caps `where x = (...)` lists and results at 500; keep chunks well below. */
const IGDB_CHUNK = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Map many Steam app ids → IGDB game ids in a handful of requests.
 * Local rows that already know their Steam app id are used first.
 */
export async function resolveIgdbIdsFromSteamAppIds(steamAppIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const unique = [...new Set(steamAppIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (unique.length === 0) return result;

  const cached = await prisma.game.findMany({
    where: { steamAppId: { in: unique } },
    select: { steamAppId: true, igdbId: true, id: true },
  });
  for (const row of cached) {
    if (!row.steamAppId) continue;
    const igdbId = row.igdbId ?? (/^\d+$/.test(row.id) ? parseInt(row.id, 10) : null);
    if (igdbId) result.set(row.steamAppId, igdbId);
  }

  const missing = unique.filter((id) => !result.has(id));
  for (const group of chunk(missing, IGDB_CHUNK)) {
    const uids = group.map((id) => `"${id}"`).join(',');
    const rows: Array<{ game?: number; uid?: string }> = await fetchIGDB(
      'external_games',
      `fields game, uid;
       where external_game_source = ${IGDB_EXTERNAL_SOURCE_STEAM} & uid = (${uids});
       limit 500;`,
      { revalidate: 60 * 60 * 24 }
    );
    for (const row of rows ?? []) {
      const appId = row.uid ? parseInt(row.uid, 10) : NaN;
      if (Number.isInteger(appId) && typeof row.game === 'number' && !result.has(appId)) {
        result.set(appId, row.game);
      }
    }
  }

  return result;
}

/** Single-id convenience wrapper around the batched resolver. */
export async function resolveIgdbIdFromSteamAppId(steamAppId: number): Promise<number | null> {
  const map = await resolveIgdbIdsFromSteamAppIds([steamAppId]);
  return map.get(steamAppId) ?? null;
}

export type IGDBGameDetails = Pick<
  IGDBGame,
  'id' | 'name' | 'slug' | 'summary' | 'cover' | 'first_release_date' | 'genres' | 'platforms' | 'involved_companies'
>;

/** Fetch full details for many IGDB game ids, chunked. */
export async function fetchIGDBGamesByIds(igdbIds: number[]): Promise<IGDBGameDetails[]> {
  const unique = [...new Set(igdbIds)];
  const out: IGDBGameDetails[] = [];
  for (const group of chunk(unique, IGDB_CHUNK)) {
    const rows: IGDBGameDetails[] = await fetchIGDB(
      'games',
      `fields name, slug, summary, cover.image_id, first_release_date,
              genres.name, platforms.name,
              involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
       where id = (${group.join(',')});
       limit 500;`,
      { revalidate: 60 * 60 * 24 }
    );
    out.push(...(rows ?? []));
  }
  return out;
}

/** Shape an IGDB game into the columns of our local `Game` row. */
export function toLocalGameRow(game: IGDBGameDetails) {
  const id = String(game.id);
  const developer = game.involved_companies?.find((c) => c.developer)?.company?.name ?? null;
  const publisher = game.involved_companies?.find((c) => c.publisher)?.company?.name ?? null;
  const slug = game.slug || `${game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`;
  return {
    id,
    igdbId: game.id,
    name: game.name,
    slug,
    description: game.summary ?? null,
    coverImage: getIGDBImageUrl(game.cover?.image_id, 'cover_big'),
    releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
    developer,
    publisher,
    genres: game.genres?.map((g) => g.name).filter(Boolean) ?? [],
    platforms: game.platforms?.map((p) => p.name).filter(Boolean) ?? [],
  };
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
