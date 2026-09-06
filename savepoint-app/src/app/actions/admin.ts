'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sendReviewRemovalEmail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';

// Helper to check admin access
async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || !(session.user as any).isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function removeReview(reviewId: string, category: string, customReason?: string) {
  try {
    await ensureAdmin();

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { user: true, game: true }
    });

    if (!review) return { error: 'Review not found' };

    let fullReason = `Category: ${category}`;
    if (customReason) {
      fullReason += `<br><br>Additional Details: ${customReason}`;
    }

    // Delete review
    await prisma.review.delete({ where: { id: reviewId } });

    // Send moderation email
    await sendReviewRemovalEmail(
      review.user.email,
      review.user.username,
      review.game.name,
      fullReason
    );

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to remove review:', error);
    return { error: error.message || 'Internal Server Error' };
  }
}

export async function banUser(userId: string, reason: string, banIp: boolean = true) {
  try {
    await ensureAdmin();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'User not found' };

    // Update user to banned status
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, bannedReason: reason }
    });

    // Optionally ban their last known IP
    if (banIp && user.lastIp) {
      // Upsert just in case it's already banned to prevent unique constraint error
      await prisma.bannedIP.upsert({
        where: { ip: user.lastIp },
        update: { reason },
        create: { ip: user.lastIp, reason }
      });
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/reviews');
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to ban user:', error);
    return { error: error.message || 'Internal Server Error' };
  }
}
