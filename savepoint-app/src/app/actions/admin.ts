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
    revalidatePath('/admin/reports');

    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to ban user:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}

export async function setUserOfficial(userId: string, isOfficial: boolean) {
  try {
    await ensureAdmin();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (!user) return { error: 'User not found' };

    // Savepoint account always stays official.
    if (user.username.toLowerCase() === 'savepoint') {
      await prisma.user.update({
        where: { id: userId },
        data: { isOfficial: true },
      });
      revalidatePath('/admin/users');
      return { success: true };
    }

    if (isOfficial) {
      await prisma.$transaction([
        prisma.user.updateMany({ where: { isOfficial: true, NOT: { username: 'savepoint' } }, data: { isOfficial: false } }),
        prisma.user.update({
          where: { id: userId },
          data: { isOfficial: true },
        }),
        // Ensure savepoint stays official if present
        prisma.user.updateMany({
          where: { username: { equals: 'savepoint', mode: 'insensitive' } },
          data: { isOfficial: true },
        }),
      ]);
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { isOfficial: false },
      });
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}

/**
 * Ban empty spam accounts created recently (random usernames / SMS gateway emails).
 * Does not touch admins, the Savepoint account, or users with reviews/lists.
 */
export async function purgeRecentSpamSignups(days = 7) {
  try {
    await ensureAdmin();
    const { looksLikeGeneratedUsername, isSmsGatewayEmail, isDisposableEmail } = await import(
      '@/lib/signup-guard'
    );

    const since = new Date(Date.now() - Math.max(1, Math.min(30, days)) * 24 * 60 * 60 * 1000);
    const candidates = await prisma.user.findMany({
      where: {
        createdAt: { gte: since },
        isAdmin: false,
        isBanned: false,
        NOT: { username: { equals: 'savepoint', mode: 'insensitive' } },
        reviews: { none: {} },
        lists: { none: {} },
      },
      select: {
        id: true,
        username: true,
        email: true,
        lastIp: true,
        _count: { select: { userGames: true } },
      },
      take: 500,
    });

    const spam = candidates.filter(
      (u) =>
        looksLikeGeneratedUsername(u.username) ||
        isSmsGatewayEmail(u.email) ||
        isDisposableEmail(u.email) ||
        // Empty shell with no library activity either
        (u._count.userGames === 0 &&
          /^[A-Za-z0-9]{16,}$/.test(u.username) &&
          /[a-z]/.test(u.username) &&
          /[A-Z]/.test(u.username))
    );

    if (spam.length === 0) {
      return { success: true as const, banned: 0 };
    }

    const ids = spam.map((u) => u.id);
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        isBanned: true,
        bannedReason: 'Automated spam signup purge',
        isOfficial: false,
      },
    });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });

    // Ban IPs that appear more than once among spam accounts
    const ipCounts = new Map<string, number>();
    for (const u of spam) {
      if (!u.lastIp || u.lastIp === 'Unknown') continue;
      ipCounts.set(u.lastIp, (ipCounts.get(u.lastIp) || 0) + 1);
    }
    for (const [ip, count] of ipCounts) {
      if (count < 2) continue;
      await prisma.bannedIP.upsert({
        where: { ip },
        update: { reason: 'Repeated spam signups' },
        create: { ip, reason: 'Repeated spam signups' },
      });
    }

    revalidatePath('/admin/users');
    return { success: true as const, banned: spam.length };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}

/**
 * Permanently delete a user and cascaded content.
 * Cannot delete yourself, other admins, or the Savepoint account.
 */
export async function deleteUser(userId: string, banIp = false) {
  try {
    const session = await ensureAdmin();

    if (session.user.id === userId) {
      return { error: 'You cannot delete your own account from admin.' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        lastIp: true,
      },
    });
    if (!user) return { error: 'User not found' };

    if (user.isAdmin) {
      return { error: 'Admin accounts cannot be deleted this way.' };
    }

    if (user.username.toLowerCase() === 'savepoint') {
      return { error: 'The Savepoint account cannot be deleted.' };
    }

    if (banIp && user.lastIp && user.lastIp !== 'Unknown') {
      await prisma.bannedIP.upsert({
        where: { ip: user.lastIp },
        update: { reason: `Deleted account @${user.username}` },
        create: { ip: user.lastIp, reason: `Deleted account @${user.username}` },
      });
    }

    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });
    await prisma.user.delete({ where: { id: userId } });

    invalidateReviewsCache();
    revalidatePath('/admin/users');
    revalidatePath('/admin/reviews');
    revalidatePath('/admin/reports');
    revalidatePath(`/profile/${user.username}`);

    return { success: true as const, username: user.username };
  } catch (error: unknown) {
    console.error('Failed to delete user:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: message };
  }
}
