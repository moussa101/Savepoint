'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updatePrivacySettings(isPrivate: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { isPrivate },
  });

  revalidatePath('/settings');
  revalidatePath(`/profile/${session.user.username}`);
  return { success: true };
}

export async function updateNotificationSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifyOnFollow: formData.get('notifyOnFollow') === 'on',
      notifyOnReviewLike: formData.get('notifyOnReviewLike') === 'on',
      notifyOnComment: formData.get('notifyOnComment') === 'on',
      notifyOnListLike: formData.get('notifyOnListLike') === 'on',
    },
  });

  revalidatePath('/settings');
  return { success: true };
}
