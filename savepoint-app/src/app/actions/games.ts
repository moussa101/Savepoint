'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';
import { grantXP, evaluateBadges, XP_REWARDS } from '@/lib/gamification';

export async function searchIGDBGamesAutocomplete(query: string) {
  if (!query || query.trim().length < 2) return [];

  const igdbQuery = `
    search "${query.replace(/"/g, '')}";
    fields name, cover.image_id, first_release_date;
    limit 10;
  `;

  const results = await fetchIGDB('games', igdbQuery);

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
    fields name, summary, cover.image_id, first_release_date, slug,
    genres.name, platforms.name,
    involved_companies.company.name, involved_companies.developer;
    where id = ${igdbId};
  `;

  const results = await fetchIGDB('games', query);
  if (!results || results.length === 0) throw new Error('Game not found on IGDB');

  const game = results[0];
  const developer = game.involved_companies?.find((c: any) => c.developer)?.company?.name || null;
  const genres = game.genres?.map((g: any) => g.name) || [];
  const platforms = game.platforms?.map((p: any) => p.name) || [];

  const slug = game.slug || `${game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${igdbId}`;

  const localGame = await prisma.game.upsert({
    where: { slug },
    update: {}, // Already exists, do nothing
    create: {
      id: igdbId,
      igdbId: parseInt(igdbId),
      name: game.name,
      slug,
      description: game.summary,
      coverImage: game.cover?.image_id ? getIGDBImageUrl(game.cover.image_id, 'cover_big') : null,
      releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
      developer,
      genres: {
        create: genres.map((name: string) => ({
          genre: name
        }))
      },
      platforms: {
        create: platforms.map((name: string) => ({
          platform: name
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

  const userGame = await prisma.userGame.upsert({
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

  await prisma.activity.upsert({
    where: { userGameId: userGame.id },
    update: {},
    create: {
      userId: session.user.id,
      type: 'TRACKING',
      userGameId: userGame.id,
    }
  });

  if (status === 'COMPLETED') {
    await grantXP(session.user.id, XP_REWARDS.COMPLETE_GAME);
  } else {
    await grantXP(session.user.id, XP_REWARDS.TRACK_GAME);
  }
  await evaluateBadges(session.user.id);

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
    const userGame = await prisma.userGame.create({
      data: {
        userId: session.user.id,
        gameId,
        rating,
        status: 'PLAYING',
      },
    });

    await prisma.activity.upsert({
      where: { userGameId: userGame.id },
      update: {},
      create: {
        userId: session.user.id,
        type: 'TRACKING',
        userGameId: userGame.id,
      }
    });

    await grantXP(session.user.id, XP_REWARDS.TRACK_GAME);
    await evaluateBadges(session.user.id);
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

  const review = await prisma.review.create({
    data: {
      userId: session.user.id,
      gameId,
      rating,
      text,
      containsSpoilers,
    },
  });

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      type: 'REVIEW',
      reviewId: review.id,
    }
  });

  await grantXP(session.user.id, XP_REWARDS.WRITE_REVIEW);
  await evaluateBadges(session.user.id);

  // Update review count
  const reviewCount = await prisma.review.count({ where: { gameId } });
  await prisma.game.update({
    where: { id: gameId },
    data: {
      reviewCount,
    },
  });

  // Also rate the game
  await rateGame(gameId, rating);

  revalidatePath(`/games/${gameId}`);
  return { success: true };
}

export async function updateReview(reviewId: string, formData: FormData) {
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

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review || review.userId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating,
      text: text.trim(),
      containsSpoilers,
    },
  });

  // Also update the game rating if changed
  await rateGame(review.gameId, rating);

  revalidatePath(`/games/${review.gameId}`);
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
    
    // Delete the notification
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (review && review.userId !== session.user.id) {
      await prisma.notification.deleteMany({
        where: {
          userId: review.userId,
          type: 'REVIEW_LIKE',
          sourceId: session.user.id,
          reviewId,
        }
      });
    }
  } else {
    await prisma.reviewLike.create({
      data: {
        userId: session.user.id,
        reviewId,
      },
    });

    // Create a notification
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (review && review.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: 'REVIEW_LIKE',
          sourceId: session.user.id,
          reviewId,
        }
      });
    }
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

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      type: 'LIST',
      listId: list.id,
    }
  });

  await grantXP(session.user.id, XP_REWARDS.CREATE_LIST);
  await evaluateBadges(session.user.id);

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
  const playtimeStr = formData.get('playtime') as string;

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
      playtime: playtimeStr ? parseInt(playtimeStr, 10) : null,
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

export async function createComment(reviewId: string, text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!text || text.trim().length === 0) {
    return { error: 'Comment text is required' };
  }

  const comment = await prisma.comment.create({
    data: {
      userId: session.user.id,
      reviewId,
      text: text.trim(),
    },
  });

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { gameId: true, userId: true },
  });

  if (review) {
    if (review.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: 'COMMENT',
          sourceId: session.user.id,
          reviewId,
        }
      });
    }
    revalidatePath(`/games/${review.gameId}`);
  }

  return { success: true, commentId: comment.id };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { review: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  // Can delete if own comment OR own review
  if (comment.userId !== session.user.id && comment.review.userId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  revalidatePath(`/games/${comment.review.gameId}`);
  return { success: true };
}

export async function toggleFavoriteGame(gameId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const existing = await prisma.favoriteGame.findUnique({
    where: {
      userId_gameId: {
        userId: session.user.id,
        gameId,
      },
    },
  });

  if (existing) {
    await prisma.favoriteGame.delete({
      where: { id: existing.id },
    });
  } else {
    // Optional: Could count existing favorites to enforce a limit (e.g. max 4 favorites)
    const count = await prisma.favoriteGame.count({
      where: { userId: session.user.id }
    });
    
    if (count >= 10) {
      return { error: 'You can only have up to 10 favorite games.' };
    }

    const maxOrder = await prisma.favoriteGame.aggregate({
      where: { userId: session.user.id },
      _max: { order: true }
    });

    const favorite = await prisma.favoriteGame.create({
      data: {
        userId: session.user.id,
        gameId,
        order: (maxOrder?._max.order ?? -1) + 1,
      },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: 'FAVORITE',
        favoriteId: favorite.id,
      }
    });
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { slug: true }
  });

  if (game) {
    revalidatePath(`/games/${game.slug}`);
  }
  revalidatePath(`/profile/${session.user.username}`);
  
  return { success: true, isFavorited: !existing };
}

