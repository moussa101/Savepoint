import { prisma } from '@/lib/db';
import { fetchIGDB, type IGDBGame } from '@/lib/igdb';
import { cache } from 'react';

const GAME_FIELDS = `fields id, name, slug, summary, cover.image_id, artworks.image_id, screenshots.image_id, first_release_date, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, platforms.name, websites.type, websites.url`;

/** Extract trailing `-{igdbId}` from synthetic slugs like `fallout-new-vegas-16`. */
export function parseSyntheticIgdbId(slug: string): number | null {
  const m = slug.match(/-(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function fetchIgdbBySlug(slug: string): Promise<IGDBGame | null> {
  const safe = slug.replace(/"/g, '');
  if (!safe) return null;
  const rows = await fetchIGDB(
    'games',
    `${GAME_FIELDS};
     where slug = "${safe}"; limit 1;`
  );
  return rows?.[0] ?? null;
}

async function fetchIgdbById(id: number): Promise<IGDBGame | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await fetchIGDB(
    'games',
    `${GAME_FIELDS};
     where id = ${id}; limit 1;`
  );
  return rows?.[0] ?? null;
}

/**
 * Resolve an IGDB game from a URL slug.
 * Supports canonical IGDB slugs and legacy local slugs (`name-{igdbId}`) /
 * numeric Game.id rows created by Steam sync before igdbId was populated.
 */
export const resolveIgdbGameFromSlug = cache(async (slug: string): Promise<IGDBGame | null> => {
  try {
    const bySlug = await fetchIgdbBySlug(slug);
    if (bySlug) return bySlug;

    const local = await prisma.game.findUnique({
      where: { slug },
      select: { id: true, igdbId: true },
    });

    const candidates = [
      local?.igdbId ?? null,
      local && /^\d+$/.test(local.id) ? parseInt(local.id, 10) : null,
      parseSyntheticIgdbId(slug),
    ].filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0);

    for (const id of [...new Set(candidates)]) {
      const byId = await fetchIgdbById(id);
      if (byId) return byId;
    }

    return null;
  } catch (error) {
    console.error('resolveIgdbGameFromSlug failed:', error);
    return null;
  }
});

/**
 * Find the best local Game row for an IGDB title (legacy id / wrong slug / canonical).
 */
export async function findLocalGameForIgdb(igdb: IGDBGame, requestSlug: string) {
  return prisma.game.findFirst({
    where: {
      OR: [
        { slug: requestSlug },
        { slug: igdb.slug },
        { igdbId: igdb.id },
        { id: String(igdb.id) },
      ],
    },
  });
}

/**
 * Point the local row at the canonical IGDB slug + igdbId when safe.
 * Returns the row that should be used going forward.
 */
export async function canonicalizeLocalGame(
  existing: NonNullable<Awaited<ReturnType<typeof findLocalGameForIgdb>>>,
  igdb: IGDBGame,
  meta: {
    coverImage: string | null;
    bannerImage: string | null;
    releaseDate: Date | null;
    developer: string | null;
    publisher: string | null;
    description: string | null;
  }
) {
  const occupant = await prisma.game.findUnique({
    where: { slug: igdb.slug },
    select: { id: true },
  });

  // Another row already owns the canonical slug — keep using that one if different.
  if (occupant && occupant.id !== existing.id) {
    // Still backfill igdbId on the legacy row so future lookups work.
    if (existing.igdbId == null) {
      await prisma.game
        .update({
          where: { id: existing.id },
          data: { igdbId: igdb.id },
        })
        .catch(() => null); // unique constraint if igdbId already on occupant
    }
    return prisma.game.findUnique({ where: { id: occupant.id } });
  }

  return prisma.game.update({
    where: { id: existing.id },
    data: {
      igdbId: igdb.id,
      slug: igdb.slug,
      name: igdb.name,
      description: meta.description,
      coverImage: meta.coverImage,
      bannerImage: meta.bannerImage,
      releaseDate: meta.releaseDate,
      developer: meta.developer,
      publisher: meta.publisher,
    },
  });
}
