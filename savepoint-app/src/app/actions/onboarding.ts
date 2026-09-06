'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureGameExistsLocally } from './games';
import { redirect } from 'next/navigation';

export async function submitOnboarding(ratings: { id: string; rating: 'LIKE' | 'DISLIKE' }[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // We should have at least 5 ratings, but we'll accept whatever is sent in case of partial completion
  
  for (const { id: igdbId, rating } of ratings) {
    try {
      // Fetch and save game metadata to our local DB
      const localGameId = await ensureGameExistsLocally(igdbId);
      
      // Save the user's rating
      const numericRating = rating === 'LIKE' ? 5.0 : 1.0;
      
      await prisma.userGame.upsert({
        where: {
          userId_gameId: {
            userId: session.user.id,
            gameId: localGameId
          }
        },
        update: {
          status: 'COMPLETED',
          rating: numericRating
        },
        create: {
          userId: session.user.id,
          gameId: localGameId,
          status: 'COMPLETED',
          rating: numericRating
        }
      });
    } catch (err) {
      console.error(`Failed to save onboarding rating for game ${igdbId}`, err);
    }
  }

  // Mark the user as onboarded
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboarded: true }
  });

  redirect('/feed');
}
