'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updatePrivacySettings(input: {
  isPrivate?: boolean;
  libraryPublic?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const data: { isPrivate?: boolean; libraryPublic?: boolean } = {};
  if (typeof input.isPrivate === 'boolean') data.isPrivate = input.isPrivate;
  if (typeof input.libraryPublic === 'boolean') data.libraryPublic = input.libraryPublic;
  if (Object.keys(data).length === 0) {
    return { error: 'Nothing to update' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  revalidatePath('/settings');
  revalidatePath(`/profile/${session.user.username}`);
  revalidatePath(`/profile/${session.user.username}/library`);
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
      notifyOnGameRelease: formData.get('notifyOnGameRelease') === 'on',
    },
  });

  revalidatePath('/settings');
  return { success: true };
}
