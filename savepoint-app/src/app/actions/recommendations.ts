'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchIGDBFresh, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import { IGDB_GENRES } from '@/lib/igdb-constants';

export type Recommendation = {
  id: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  genres: string[];
  rating: number;
  score: number;
  reason: string;
};

type ScoredCandidate = {
  game: IGDBGame;
  similarity: number;
  genreScore: number;
  themeScore: number;
  qualityScore: number;
  developerScore: number;
  total: number;
  reasons: string[];
};

const MAIN_GAME_CATEGORY = 0;

/** Prefer explicit igdbId; fall back to numeric Game.id (legacy rows often omit igdbId). */
function resolveIgdbId(game: { id: string; igdbId: number | null }): number | null {
  if (typeof game.igdbId === 'number' && Number.isFinite(game.igdbId)) return game.igdbId;
  if (/^\d+$/.test(game.id)) return parseInt(game.id, 10);
  return null;
}

function genreNameToId(name: string): number | undefined {
  const hit = IGDB_GENRES.find((g) => g.name.toLowerCase() === name.toLowerCase());
  return hit?.id;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function qualitySignal(rating?: number, count?: number) {
  const r = (rating || 0) / 100;
  const c = Math.log10(Math.max(count || 1, 1) + 1) / 4;
  return clamp01(r * 0.7 + c * 0.3);
}

async function safeIGDB(endpoint: string, query: string): Promise<IGDBGame[]> {
  try {
    const res = await fetchIGDBFresh(endpoint, query);
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error('Recommendation IGDB fetch failed:', error);
    return [];
  }
}

/**
 * Multi-signal recommendation engine (live IGDB, no local cache):
 * similarity, genre affinity, themes, quality, developer affinity.
 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const [ratedGames, favorites, library] = await Promise.all([
      prisma.userGame.findMany({
        where: {
          userId: session.user.id,
          OR: [{ rating: { gte: 3.5 } }, { status: { in: ['COMPLETED', 'PLAYING'] } }],
        },
        include: {
          game: {
            include: { genres: true },
          },
        },
        orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }],
        take: 40,
      }),
      prisma.favoriteGame.findMany({
        where: { userId: session.user.id },
        include: {
          game: { include: { genres: true } },
        },
        take: 12,
      }),
      prisma.userGame.findMany({
        where: { userId: session.user.id },
        select: { game: { select: { id: true, igdbId: true } } },
      }),
    ]);

    const excluded = new Set<number>();
    for (const row of library) {
      const id = resolveIgdbId(row.game);
      if (id != null) excluded.add(id);
    }

    const genreWeights = new Map<string, number>();
    const themeWeights = new Map<string, number>();
    const developerWeights = new Map<string, number>();
    const seedIds: number[] = [];

    function addGenreWeight(genre: string, weight: number) {
      genreWeights.set(genre, (genreWeights.get(genre) || 0) + weight);
    }

    function addThemeWeight(theme: string, weight: number) {
      themeWeights.set(theme, (themeWeights.get(theme) || 0) + weight);
    }

    function addDeveloperWeight(name: string | null | undefined, weight: number) {
      if (!name) return;
      developerWeights.set(name, (developerWeights.get(name) || 0) + weight);
    }

    for (const ug of ratedGames) {
      const igdbId = resolveIgdbId(ug.game);
      if (igdbId == null) continue;
      const ratingWeight = ug.rating ? ug.rating / 5 : ug.status === 'COMPLETED' ? 0.75 : 0.55;
      seedIds.push(igdbId);
      for (const g of ug.game.genres) addGenreWeight(g.genre, ratingWeight);
      addDeveloperWeight(ug.game.developer, ratingWeight);
    }

    for (const fav of favorites) {
      const igdbId = resolveIgdbId(fav.game);
      if (igdbId == null) continue;
      seedIds.push(igdbId);
      for (const g of fav.game.genres) addGenreWeight(g.genre, 1.25);
      addDeveloperWeight(fav.game.developer, 1.25);
    }

    const uniqueSeeds = [...new Set(seedIds)].slice(0, 12);
    const topGenres = [...genreWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topGenreIds = topGenres
      .map(([name]) => genreNameToId(name))
      .filter((id): id is number => typeof id === 'number')
      .slice(0, 3);

    const candidates = new Map<number, ScoredCandidate>();

    function upsertCandidate(game: IGDBGame, patch: Partial<ScoredCandidate> & { reason?: string }) {
      if (!game?.id || !game.slug || !game.name) return;
      if (game.category != null && game.category !== MAIN_GAME_CATEGORY) return;
      if (excluded.has(game.id) || uniqueSeeds.includes(game.id)) return;

      const existing = candidates.get(game.id);
      if (!existing) {
        candidates.set(game.id, {
          game,
          similarity: patch.similarity || 0,
          genreScore: patch.genreScore || 0,
          themeScore: patch.themeScore || 0,
          qualityScore: patch.qualityScore || qualitySignal(game.total_rating, game.total_rating_count),
          developerScore: patch.developerScore || 0,
          total: 0,
          reasons: patch.reason ? [patch.reason] : [],
        });
        return;
      }

      existing.similarity += patch.similarity || 0;
      existing.genreScore = Math.max(existing.genreScore, patch.genreScore || 0);
      existing.themeScore = Math.max(existing.themeScore, patch.themeScore || 0);
      existing.developerScore = Math.max(existing.developerScore, patch.developerScore || 0);
      existing.qualityScore = Math.max(
        existing.qualityScore,
        patch.qualityScore || qualitySignal(game.total_rating, game.total_rating_count)
      );
      if (patch.reason && !existing.reasons.includes(patch.reason)) {
        existing.reasons.push(patch.reason);
      }
      if ((game.genres?.length || 0) > (existing.game.genres?.length || 0)) {
        existing.game = { ...existing.game, ...game };
      }
    }

    const fetches: Promise<void>[] = [];

    // Signal A: similar_games from taste seeds
    if (uniqueSeeds.length > 0) {
      fetches.push(
        (async () => {
          const res = await safeIGDB(
            'games',
            `
            fields name, themes.name,
                   similar_games.id, similar_games.name, similar_games.slug, similar_games.cover.image_id,
                   similar_games.genres.name, similar_games.themes.name, similar_games.total_rating,
                   similar_games.total_rating_count, similar_games.category,
                   similar_games.involved_companies.company.name, similar_games.involved_companies.developer;
            where id = (${uniqueSeeds.join(',')});
            limit ${uniqueSeeds.length};
            `
          );

          for (const source of res) {
            for (const theme of source.themes || []) {
              addThemeWeight(theme.name, 1);
            }
            for (const similar of source.similar_games || []) {
              upsertCandidate(similar, {
                similarity: 1,
                reason: 'Similar to games you love',
              });
            }
          }
        })()
      );
    }

    // Signal B: quality games in the user's strongest genre
    if (topGenreIds.length > 0) {
      fetches.push(
        (async () => {
          const primaryGenreId = topGenreIds[0];
          const res = await safeIGDB(
            'games',
            `
            fields name, slug, cover.image_id, genres.name, themes.name, total_rating, total_rating_count, category,
                   involved_companies.company.name, involved_companies.developer;
            where category = ${MAIN_GAME_CATEGORY}
              & genres = ${primaryGenreId}
              & total_rating >= 75
              & total_rating_count >= 40;
            sort total_rating desc;
            limit 40;
            `
          );

          const maxGenreWeight = Math.max(...topGenres.map(([, w]) => w), 1);
          for (const game of res) {
            const overlap = (game.genres || []).reduce((sum, g) => {
              return sum + (genreWeights.get(g.name) || 0);
            }, 0);
            const genreScore = clamp01(overlap / maxGenreWeight) || 0.5;
            upsertCandidate(game, {
              genreScore,
              reason: `Matches your ${topGenres[0][0]} taste`,
            });
          }
        })()
      );
    }

    // Signal C: acclaimed mains (cold-start or sparse results)
    fetches.push(
      (async () => {
        const res = await safeIGDB(
          'games',
          `
          fields name, slug, cover.image_id, genres.name, themes.name, total_rating, total_rating_count, category;
          where category = ${MAIN_GAME_CATEGORY}
            & total_rating >= 85
            & total_rating_count >= 500;
          sort total_rating_count desc;
          limit 24;
          `
        );
        for (const game of res) {
          upsertCandidate(game, {
            qualityScore: qualitySignal(game.total_rating, game.total_rating_count),
            reason: uniqueSeeds.length > 0 ? 'Highly acclaimed' : 'Popular starter pick',
          });
        }
      })()
    );

    await Promise.all(fetches);

    const maxDevWeight = Math.max(...developerWeights.values(), 1);
    const maxThemeWeight = Math.max(...themeWeights.values(), 1);
    for (const candidate of candidates.values()) {
      const developer = candidate.game.involved_companies?.find((c) => c.developer)?.company?.name;
      if (developer && developerWeights.has(developer)) {
        candidate.developerScore = clamp01((developerWeights.get(developer) || 0) / maxDevWeight);
        if (!candidate.reasons.includes(`From ${developer}`)) {
          candidate.reasons.push(`From ${developer}`);
        }
      }

      if (themeWeights.size > 0) {
        const themeOverlap = (candidate.game.themes || []).reduce((sum, t) => {
          return sum + (themeWeights.get(t.name) || 0);
        }, 0);
        candidate.themeScore = clamp01(themeOverlap / maxThemeWeight);
      }

      candidate.qualityScore = Math.max(
        candidate.qualityScore,
        qualitySignal(candidate.game.total_rating, candidate.game.total_rating_count)
      );

      const simNorm = clamp01(candidate.similarity / 3);

      candidate.total =
        simNorm * 0.35 +
        candidate.genreScore * 0.25 +
        candidate.themeScore * 0.1 +
        candidate.qualityScore * 0.2 +
        candidate.developerScore * 0.1;
    }

    const ranked = [...candidates.values()].sort((a, b) => b.total - a.total);
    const genreCounts = new Map<string, number>();
    const picked: ScoredCandidate[] = [];

    for (const item of ranked) {
      const primaryGenre = item.game.genres?.[0]?.name || 'Other';
      const count = genreCounts.get(primaryGenre) || 0;
      if (count >= 3) continue;
      genreCounts.set(primaryGenre, count + 1);
      picked.push(item);
      if (picked.length >= 12) break;
    }

    // If diversity filter was too strict, fill from remaining ranked
    if (picked.length < 8) {
      for (const item of ranked) {
        if (picked.includes(item)) continue;
        picked.push(item);
        if (picked.length >= 12) break;
      }
    }

    return picked.map((item) => ({
      id: item.game.id.toString(),
      name: item.game.name,
      slug: item.game.slug,
      coverUrl: getIGDBImageUrl(item.game.cover?.image_id, 'cover_big'),
      genres: item.game.genres?.map((g) => g.name) || [],
      rating: item.game.total_rating ? (item.game.total_rating / 100) * 5 : 0,
      score: Math.round(item.total * 100),
      reason: item.reasons[0] || 'Personalized pick',
    }));
  } catch (error) {
    console.error('Failed to get algorithmic recommendations:', error);
    return [];
  }
}
