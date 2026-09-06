'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const VALID_TYPES = ['REVIEW', 'COMMENT', 'PROFILE', 'LIST'] as const;
const VALID_REASONS = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'COPYRIGHT', 'OTHER'] as const;

export async function createReport(input: {
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  reportedUserId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!VALID_TYPES.includes(input.targetType as (typeof VALID_TYPES)[number])) {
    return { error: 'Invalid report target' };
  }

  if (!VALID_REASONS.includes(input.reason as (typeof VALID_REASONS)[number])) {
    return { error: 'Invalid report reason' };
  }

  if (input.reportedUserId && input.reportedUserId === session.user.id) {
    return { error: 'You cannot report yourself' };
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'OPEN',
    },
  });

  if (existing) {
    return { error: 'You already reported this' };
  }

  await prisma.report.create({
    data: {
      reporterId: session.user.id,
      reportedUserId: input.reportedUserId || null,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details?.trim() || null,
    },
  });

  revalidatePath('/admin');
  return { success: true };
}

export async function resolveReport(reportId: string, status: 'RESOLVED' | 'DISMISSED') {
  try {
    const { ensureAdmin } = await import('@/lib/authz');
    await ensureAdmin();
  } catch {
    return { error: 'Not authorized' };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });

  revalidatePath('/admin/reports');
  return { success: true };
}
