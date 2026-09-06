'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function toggleActivityLike(activityId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const userId = session.user.id;

  const existingLike = await prisma.activityLike.findUnique({
    where: {
      userId_activityId: {
        userId,
        activityId,
      },
    },
  });

  if (existingLike) {
    await prisma.activityLike.delete({
      where: { id: existingLike.id },
    });
  } else {
    await prisma.activityLike.create({
      data: {
        userId,
        activityId,
      },
    });
  }

  revalidatePath('/feed');
  return { success: true };
}

export async function createActivityComment(activityId: string, text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { error: 'Comment text is required' };
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  });

  if (!activity) {
    return { error: 'Activity not found' };
  }

  const comment = await prisma.activityComment.create({
    data: {
      userId: session.user.id,
      activityId,
      text: trimmed,
    },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  revalidatePath('/feed');
  return { success: true, comment };
}

export async function deleteActivityComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const comment = await prisma.activityComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  if (comment.userId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await prisma.activityComment.delete({ where: { id: commentId } });
  revalidatePath('/feed');
  return { success: true };
}

export async function toggleCommentLike(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { review: { select: { game: { select: { slug: true } } } } },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  if (comment.userId === session.user.id) {
    return { error: 'You cannot like your own comment' };
  }

  const existing = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId: session.user.id,
        commentId,
      },
    },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({
      data: {
        userId: session.user.id,
        commentId,
      },
    });
  }

  if (comment.review.game.slug) {
    revalidatePath(`/games/${comment.review.game.slug}`);
  }

  return { success: true, liked: !existing };
}
