'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function toggleListLike(listId: string, currentLikeStatus: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      userId: true,
      visibility: true,
      user: { select: { notifyOnListLike: true } },
    },
  });

  if (!list) {
    return { error: 'List not found' };
  }

  if (list.visibility !== 'PUBLIC' && list.userId !== userId) {
    return { error: 'Not authorized' };
  }

  if (list.userId === userId) {
    return { error: 'You cannot like your own list' };
  }

  try {
    if (currentLikeStatus) {
      await prisma.listLike.delete({
        where: {
          userId_listId: {
            userId,
            listId,
          },
        },
      });
    } else {
      await prisma.listLike.create({
        data: {
          userId,
          listId,
        },
      });

      if (list.user.notifyOnListLike !== false) {
        await prisma.notification.create({
          data: {
            userId: list.userId,
            type: 'LIST_LIKE',
            sourceId: userId,
            listId,
          },
        });
      }
    }

    revalidatePath(`/lists/${listId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle list like:', error);
    return { error: 'An error occurred' };
  }
}

export async function getPopularLists() {
  const popularLists = await prisma.list.findMany({
    where: {
      visibility: 'PUBLIC',
      items: {
        some: {},
      },
    },
    include: {
      user: {
        select: { name: true, username: true, image: true },
      },
      items: {
        include: { game: { select: { coverImage: true } } },
        orderBy: { order: 'asc' },
        take: 4,
      },
      _count: {
        select: { items: true, likes: true },
      },
    },
    orderBy: [
      { likes: { _count: 'desc' } },
      { items: { _count: 'desc' } },
    ],
    take: 4,
  });

  return popularLists.map((list) => ({
    ...list,
    likesCount: list._count.likes,
  }));
}
