'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';

// Cache responses in memory
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function getRecommendations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const likedGames = await prisma.userGame.findMany({
      where: {
        userId: session.user.id,
        rating: { gte: 4 },
      },
      include: { game: true },
      take: 5,
    });

    const likedIgdbIds = likedGames
      .map(ug => ug.game.igdbId)
      .filter((id): id is number => id !== null && id !== undefined);
    
    // Check in-memory cache first
    const cacheKey = likedIgdbIds.length > 0 ? likedIgdbIds.sort().join('|') : 'default-recommendations';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    let finalRecommendations: any[] = [];

    if (likedIgdbIds.length > 0) {
      // 1. Fetch similar games for these highly rated games
      const igdbQuery = `
        fields similar_games.name, similar_games.slug, similar_games.cover.image_id, similar_games.genres.name, similar_games.total_rating, similar_games.category;
        where id = (${likedIgdbIds.join(',')});
        limit 5;
      `;
      const res = await fetchIGDB('games', igdbQuery);
      
      const gameScores = new Map<number, any>();
      
      if (res && res.length > 0) {
        for (const sourceGame of res) {
          if (!sourceGame.similar_games) continue;
          
          for (const similar of sourceGame.similar_games) {
            // Filter out DLCs, bundles, and already liked games
            if (similar.category !== 0) continue;
            if (likedIgdbIds.includes(similar.id)) continue;
            
            const existing = gameScores.get(similar.id);
            if (existing) {
              existing.score += 1;
            } else {
              gameScores.set(similar.id, { ...similar, score: 1 });
            }
          }
        }
      }
      
      // Sort by score (frequency) and then total_rating
      const rankedGames = Array.from(gameScores.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aRating = a.total_rating || 0;
          const bRating = b.total_rating || 0;
          return bRating - aRating;
        })
        .slice(0, 10);
        
      finalRecommendations = rankedGames.map((game: any) => ({
        id: game.id.toString(),
        name: game.name,
        slug: game.slug,
        coverUrl: getIGDBImageUrl(game.cover?.image_id, 'cover_big'),
        genres: game.genres?.map((g: any) => g.name) || [],
        rating: game.total_rating ? (game.total_rating / 100) * 5 : 0,
      }));
    }

    // 2. Fallback to universally acclaimed popular games
    if (finalRecommendations.length === 0) {
      const fallbackIds = [1020, 1942, 1877, 1905, 1036, 1011, 25076, 73062, 11156, 114283];
      const fallbackQuery = `
        fields name, slug, cover.image_id, genres.name, total_rating, category;
        where id = (${fallbackIds.join(',')});
        limit 10;
      `;
      const res = await fetchIGDB('games', fallbackQuery);
      if (res && res.length > 0) {
        finalRecommendations = res.map((game: any) => ({
          id: game.id.toString(),
          name: game.name,
          slug: game.slug,
          coverUrl: getIGDBImageUrl(game.cover?.image_id, 'cover_big'),
          genres: game.genres?.map((g: any) => g.name) || [],
          rating: game.total_rating ? (game.total_rating / 100) * 5 : 0,
        }));
      }
    }

    // Save to cache
    cache.set(cacheKey, { data: finalRecommendations, timestamp: Date.now() });

    return finalRecommendations;
  } catch (error) {
    console.error('Failed to get algorithmic recommendations:', error);
    return [];
  }
}
