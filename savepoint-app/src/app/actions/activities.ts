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

    // We can also trigger a notification here later
  }

  revalidatePath('/feed');
  return { success: true };
}
