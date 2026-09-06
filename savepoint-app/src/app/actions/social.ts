'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function followUser(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (session.user.id === targetUserId) {
    return { error: 'You cannot follow yourself' };
  }

  try {
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    });

    // Create Notification
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true, notifyOnFollow: true },
    });

    if (target?.notifyOnFollow !== false) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'FOLLOW',
          sourceId: session.user.id,
        },
      });
    }

    if (target) {
      revalidatePath(`/profile/${target.username}`);
    }
    
    revalidatePath(`/profile/${session.user.username}`);

    return { success: true };
  } catch (error) {
    console.error('Follow error:', error);
    return { error: 'Failed to follow user' };
  }
}

export async function unfollowUser(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUserId,
        },
      },
    });

    // Clean up notification
    await prisma.notification.deleteMany({
      where: {
        userId: targetUserId,
        type: 'FOLLOW',
        sourceId: session.user.id,
      },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true }
    });

    if (targetUser) {
      revalidatePath(`/profile/${targetUser.username}`);
    }
    
    revalidatePath(`/profile/${session.user.username}`);

    return { success: true };
  } catch (error) {
    console.error('Unfollow error:', error);
    return { error: 'Failed to unfollow user' };
  }
}
