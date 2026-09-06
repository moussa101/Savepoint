'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureGameExistsLocally } from './games';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';
import { redirect } from 'next/navigation';

export async function getSimilarGamesForOnboarding(gameId: string) {
  try {
    if (!/^\d+$/.test(gameId)) {
      return [];
    }

    const query = `
      fields similar_games.name, similar_games.cover.image_id;
      where id = ${gameId};
    `;
    const results = await fetchIGDB('games', query);
    
    if (!results || results.length === 0 || !results[0].similar_games) {
      return [];
    }
    
    return results[0].similar_games.map((g: any) => ({
      id: g.id.toString(),
      name: g.name,
      coverUrl: getIGDBImageUrl(g.cover?.image_id, 'cover_big')
    })).slice(0, 5); // Return up to 5 similar games
  } catch (err) {
    console.error('Failed to fetch similar games for onboarding', err);
    return [];
  }
}

export async function submitOnboarding(ratings: { id: string; rating: 'LIKE' | 'DISLIKE' }[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // We should have at least 5 ratings, but we'll accept whatever is sent in case of partial completion
  
  for (const { id: igdbId, rating } of ratings) {
    try {
      // Save game metadata to our local DB for future recommendations
      // but do NOT add it to the user's library — onboarding is just taste profiling
      await ensureGameExistsLocally(igdbId);
    } catch (err) {
      console.error(`Failed to save onboarding game ${igdbId}`, err);
    }
  }

  // Mark the user as onboarded
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboarded: true }
  });

  redirect('/feed');
}
