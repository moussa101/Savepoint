'use server';

import { prisma } from '@/lib/db';
import { sendReviewRemovalEmail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';
import { invalidateReviewsCache } from '@/lib/cached-queries';
import { ensureAdmin } from '@/lib/authz';
import { escapeHtml } from '@/lib/security';

export async function removeReview(reviewId: string, category: string, customReason?: string) {
  try {
    await ensureAdmin();

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { user: true, game: true },
    });

    if (!review) return { error: 'Review not found' };

    const safeCategory = escapeHtml(category);
    const safeCustom = customReason ? escapeHtml(customReason) : '';
    let fullReason = `Category: ${safeCategory}`;
    if (safeCustom) {
      fullReason += `<br><br>Additional Details: ${safeCustom}`;
    }

    await prisma.review.delete({ where: { id: reviewId } });

    await sendReviewRemovalEmail(
      review.user.email,
      review.user.username,
      review.game.name,
      fullReason
    );

    invalidateReviewsCache();
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to remove review:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}

export async function banUser(userId: string, reason: string, banIp: boolean = true) {
  try {
    await ensureAdmin();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'User not found' };

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, bannedReason: reason },
    });

    if (banIp) {
      if (user.lastIp && user.lastIp !== 'Unknown') {
        await prisma.bannedIP.upsert({
          where: { ip: user.lastIp },
          update: { reason },
          create: { ip: user.lastIp, reason },
        });
      }
    }

    await prisma.session.deleteMany({ where: { userId } });

    revalidatePath('/admin/users');
    revalidatePath('/admin/reviews');

    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to ban user:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}
