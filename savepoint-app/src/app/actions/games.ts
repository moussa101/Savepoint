'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';

export async function searchIGDBGamesAutocomplete(query: string) {
  if (!query || query.trim().length < 2) return [];

  const igdbQuery = `
    search "${query.replace(/"/g, '')}";
    fields name, cover.image_id, first_release_date;
    limit 10;
  `;

  const results = await fetchIGDB('/games', igdbQuery);

  return results.map((game: any) => ({
    id: game.id.toString(),
    name: game.name,
    coverImage: game.cover?.image_id ? getIGDBImageUrl(game.cover.image_id, 'cover_small') : null,
    releaseYear: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
  }));
}

export async function ensureGameExistsLocally(igdbId: string) {
  // First check if we already have it
  const existing = await prisma.game.findUnique({
    where: { id: igdbId }
  });
  if (existing) return existing.id;

  // Otherwise, fetch full details from IGDB and upsert
  const query = `
    fields name, summary, cover.image_id, first_release_date,
    genres.name, platforms.name,
    involved_companies.company.name, involved_companies.developer;
    where id = ${igdbId};
  `;

  const results = await fetchIGDB('/games', query);
  if (!results || results.length === 0) throw new Error('Game not found on IGDB');

  const game = results[0];
  const developer = game.involved_companies?.find((c: any) => c.developer)?.company?.name || null;
  const genres = game.genres?.map((g: any) => g.name) || [];
  const platforms = game.platforms?.map((p: any) => p.name) || [];

  const localGame = await prisma.game.upsert({
    where: { id: igdbId },
    update: {}, // Already exists, do nothing
    create: {
      id: igdbId,
      name: game.name,
      slug: `${game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${igdbId}`,
      description: game.summary,
      coverImage: game.cover?.image_id ? getIGDBImageUrl(game.cover.image_id, 'cover_big') : null,
      releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
      developer,
      genres: {
        connectOrCreate: genres.map((name: string) => ({
          where: { name },
          create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
        }))
      },
      platforms: {
        connectOrCreate: platforms.map((name: string) => ({
          where: { name },
          create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
        }))
      }
    }
  });

  return localGame.id;
}

export async function addToLibrary(gameId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await prisma.userGame.upsert({
    where: {
      userId_gameId: {
        userId: session.user.id,
        gameId,
      },
    },
    update: { status },
    create: {
      userId: session.user.id,
      gameId,
      status,
    },
  });

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/profile/${session.user.username}`);
  return { success: true };
}

export async function removeFromLibrary(gameId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await prisma.userGame.deleteMany({
    where: {
      userId: session.user.id,
      gameId,
    },
  });

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/profile/${session.user.username}`);
  return { success: true };
}

export async function rateGame(gameId: string, rating: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (rating < 0.5 || rating > 5) {
    return { error: 'Rating must be between 0.5 and 5' };
  }

  // Ensure the game is in the library
  const userGame = await prisma.userGame.findUnique({
    where: {
      userId_gameId: {
        userId: session.user.id,
        gameId,
      },
    },
  });

  if (userGame) {
    await prisma.userGame.update({
      where: { id: userGame.id },
      data: { rating },
    });
  } else {
    // Add to library as completed if not already tracked
    await prisma.userGame.create({
      data: {
        userId: session.user.id,
        gameId,
        status: 'COMPLETED',
        rating,
      },
    });
  }

  // Update game aggregate rating
  const stats = await prisma.userGame.aggregate({
    where: { gameId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      avgRating: stats._avg.rating || 0,
      ratingCount: stats._count.rating || 0,
    },
  });

  revalidatePath(`/games/${gameId}`);
  return { success: true };
}

export async function createReview(gameId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const text = formData.get('text') as string;
  const rating = parseFloat(formData.get('rating') as string);
  const containsSpoilers = formData.get('containsSpoilers') === 'true';

  if (!text || text.trim().length === 0) {
    return { error: 'Review text is required' };
  }

  if (!rating || rating < 0.5 || rating > 5) {
    return { error: 'A valid rating is required' };
  }

  // Check if user already reviewed this game
  const existing = await prisma.review.findUnique({
    where: {
      userId_gameId: {
        userId: session.user.id,
        gameId,
      },
    },
  });

  if (existing) {
    return { error: 'You have already reviewed this game' };
  }

  await prisma.review.create({
    data: {
      userId: session.user.id,
      gameId,
      rating,
      text: text.trim(),
      containsSpoilers,
    },
  });

  // Update review count
  const reviewCount = await prisma.review.count({ where: { gameId } });
  await prisma.game.update({
    where: { id: gameId },
    data: { reviewCount },
  });

  // Also rate the game
  await rateGame(gameId, rating);

  revalidatePath(`/games/${gameId}`);
  return { success: true };
}

export async function deleteReview(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review || review.userId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  const reviewCount = await prisma.review.count({ where: { gameId: review.gameId } });
  await prisma.game.update({
    where: { id: review.gameId },
    data: { reviewCount },
  });

  revalidatePath(`/games/${review.gameId}`);
  return { success: true };
}

export async function toggleReviewLike(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const existing = await prisma.reviewLike.findUnique({
    where: {
      userId_reviewId: {
        userId: session.user.id,
        reviewId,
      },
    },
  });

  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({
      data: {
        userId: session.user.id,
        reviewId,
      },
    });
  }

  revalidatePath('/');
  return { success: true, liked: !existing };
}

export async function toggleFollow(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (session.user.id === targetUserId) {
    return { error: 'Cannot follow yourself' };
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    });
  }

  revalidatePath('/');
  return { success: true, following: !existing };
}

export async function createList(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const visibility = (formData.get('visibility') as string) || 'PUBLIC';

  if (!title || title.trim().length === 0) {
    return { error: 'List title is required' };
  }

  const list = await prisma.list.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      visibility,
    },
  });

  revalidatePath('/lists');
  return { success: true, listId: list.id };
}

export async function addGameToList(listId: string, gameId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  const maxOrder = await prisma.listItem.findFirst({
    where: { listId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  await prisma.listItem.create({
    data: {
      listId,
      gameId,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

export async function removeGameFromList(listId: string, gameId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await prisma.listItem.deleteMany({
    where: { listId, gameId },
  });

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

export async function createDiaryEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const gameId = formData.get('gameId') as string;
  const date = formData.get('date') as string;
  const status = formData.get('status') as string;
  const ratingStr = formData.get('rating') as string;
  const notes = formData.get('notes') as string;

  if (!gameId || !date) {
    return { error: 'Game and date are required' };
  }

  const rating = ratingStr ? parseFloat(ratingStr) : null;

  await prisma.diaryEntry.create({
    data: {
      userId: session.user.id,
      gameId,
      date: new Date(date),
      status: status || null,
      rating,
      notes: notes?.trim() || null,
    },
  });

  // Also update library status if provided
  if (status) {
    await addToLibrary(gameId, status);
  }
  if (rating) {
    await rateGame(gameId, rating);
  }

  revalidatePath('/diary');
  return { success: true };
}
