'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendChatWarningEmail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';

const VALID_TYPES = ['REVIEW', 'COMMENT', 'PROFILE', 'LIST', 'FORUM', 'FORUM_TOPIC', 'FORUM_REPLY', 'CONVERSATION', 'MESSAGE'] as const;
const VALID_REASONS = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'COPYRIGHT', 'OTHER'] as const;
const MAX_CHAT_LOG = 100_000;

export async function createReport(input: {
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  reportedUserId?: string;
  chatLog?: string;
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

  const isChatReport =
    input.targetType === 'CONVERSATION' || input.targetType === 'MESSAGE';

  if (isChatReport) {
    const log = input.chatLog?.trim();
    if (!log) {
      return { error: 'Chat transcript is required for message reports' };
    }
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

  const chatLog =
    isChatReport && input.chatLog
      ? input.chatLog.trim().slice(0, MAX_CHAT_LOG)
      : null;

  try {
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedUserId: input.reportedUserId || null,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details?.trim() || null,
        chatLog,
      },
    });
  } catch (e) {
    console.error('createReport failed', e);
    return { error: 'Failed to submit report. Try again.' };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/reports');
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

export async function sendReportWarningEmail(
  reportId: string,
  warningMessage: string
) {
  try {
    const { ensureAdmin } = await import('@/lib/authz');
    await ensureAdmin();
  } catch {
    return { error: 'Not authorized' };
  }

  const trimmed = warningMessage.trim();
  if (!trimmed || trimmed.length > 5000) {
    return { error: 'Warning message is required (max 5000 characters)' };
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reportedUser: { select: { id: true, email: true, username: true, name: true } },
      reporter: { select: { username: true } },
    },
  });

  if (!report) return { error: 'Report not found' };
  if (!report.reportedUser?.email) {
    return { error: 'Reported user has no email on file' };
  }

  const sent = await sendChatWarningEmail({
    email: report.reportedUser.email,
    username: report.reportedUser.username,
    displayName: report.reportedUser.name || report.reportedUser.username,
    warningMessage: trimmed,
    reason: report.reason,
    chatLog: report.chatLog,
    reporterUsername: report.reporter.username,
  });

  if (!sent) {
    return { error: 'Failed to send email. Check Gmail configuration.' };
  }

  revalidatePath('/admin/reports');
  return { success: true };
}

/** Ban the reported user (and optionally their IP), then mark the report resolved. */
export async function banFromReport(
  reportId: string,
  reason: string,
  banIp: boolean = true
) {
  try {
    const { ensureAdmin } = await import('@/lib/authz');
    await ensureAdmin();
  } catch {
    return { error: 'Not authorized' };
  }

  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { error: 'Ban reason is required' };
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportedUserId: true, reason: true, chatLog: true },
  });

  if (!report) return { error: 'Report not found' };
  if (!report.reportedUserId) {
    return { error: 'No user linked to this report' };
  }

  const { banUser } = await import('@/app/actions/admin');
  const banResult = await banUser(
    report.reportedUserId,
    trimmed.slice(0, 500),
    banIp
  );
  if (banResult.error) return banResult;

  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'RESOLVED' },
  });

  revalidatePath('/admin/reports');
  revalidatePath('/admin/users');
  return { success: true };
}
