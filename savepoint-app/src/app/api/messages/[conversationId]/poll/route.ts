import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const messageSelect = {
  id: true,
  senderId: true,
  kind: true,
  ciphertext: true,
  iv: true,
  systemPayload: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  readAt: true,
} as const;

const userLite = {
  id: true,
  username: true,
  name: true,
  image: true,
  e2ePublicKey: true,
} as const;

/**
 * Lightweight poll endpoint (JSON) — much faster than server actions for chat sync.
 * GET /api/messages/[conversationId]/poll?since=ISO
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { conversationId } = await context.params;
  const { searchParams } = new URL(request.url);
  const sinceIso = searchParams.get('since');
  const includeKeys = searchParams.get('keys') === '1';

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      type: true,
      userOneId: true,
      userTwoId: true,
      members: { where: { userId }, select: { id: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const allowed =
    conversation.type === 'GROUP'
      ? conversation.members.length > 0
      : conversation.userOneId === userId || conversation.userTwoId === userId;

  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const since = sinceIso ? new Date(sinceIso) : null;
  const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

  const [messages, readReceipts] = await Promise.all([
    prisma.directMessage.findMany({
      where: {
        conversationId,
        ...(sinceValid
          ? {
              OR: [{ createdAt: { gt: sinceValid } }, { updatedAt: { gt: sinceValid } }],
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 80,
      select: {
        ...messageSelect,
        sender: { select: userLite },
      },
    }),
    sinceValid
      ? prisma.directMessage.findMany({
          where: {
            conversationId,
            senderId: userId,
            readAt: { gt: sinceValid },
          },
          select: { id: true, readAt: true },
          take: 80,
        })
      : Promise.resolve([] as { id: string; readAt: Date | null }[]),
  ]);

  // Mark inbound as read only when there may be unread (avoid write every tick)
  const hasUnreadInbound = messages.some((m) => m.senderId !== userId && !m.readAt);
  if (hasUnreadInbound || !sinceValid) {
    void prisma.directMessage
      .updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      })
      .catch(() => null);
  }

  let peerPublicKey: string | null = null;
  let wrappedGroupKey: string | null = null;

  if (includeKeys) {
    if (conversation.type === 'DIRECT' && conversation.userOneId && conversation.userTwoId) {
      const otherId =
        conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;
      const other = await prisma.user.findUnique({
        where: { id: otherId },
        select: { e2ePublicKey: true },
      });
      peerPublicKey = other?.e2ePublicKey ?? null;
    } else if (conversation.type === 'GROUP') {
      const wrap = await prisma.groupKeyWrap.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { wrappedKey: true },
      });
      wrappedGroupKey = wrap?.wrappedKey ?? null;
    }
  }

  return NextResponse.json({
    success: true,
    messages,
    readReceipts: readReceipts
      .filter((r): r is { id: string; readAt: Date } => !!r.readAt)
      .map((r) => ({ id: r.id, readAt: r.readAt })),
    peerPublicKey,
    wrappedGroupKey,
  });
}
