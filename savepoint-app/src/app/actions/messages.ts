'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { areFriends, orderedUserPair } from '@/lib/friendship';
import { sendDirectMessageEmail } from '@/lib/mail';

function requireUserId() {
  return auth().then((session) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user.id;
  });
}

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

export async function publishE2EPublicKey(publicKeyB64: string) {
  const userId = await requireUserId();
  if (!publicKeyB64 || publicKeyB64.length < 80 || publicKeyB64.length > 2000) {
    return { error: 'Invalid public key.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { e2ePublicKey: publicKeyB64, e2ePublicKeyUpdatedAt: new Date() },
  });

  return { success: true };
}

export async function getMyE2EPublicKey() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { e2ePublicKey: true },
  });
  return user?.e2ePublicKey ?? null;
}

export async function listConversations() {
  const userId = await requireUserId();

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
    include: {
      userOne: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
      userTwo: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, senderId: true, createdAt: true, readAt: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });

  return conversations.map((c) => {
    const other = c.userOneId === userId ? c.userTwo : c.userOne;
    const last = c.messages[0] ?? null;
    const unread = !!(last && last.senderId !== userId && !last.readAt);
    return {
      id: c.id,
      lastMessageAt: c.lastMessageAt,
      other,
      lastMessageAtPreview: last?.createdAt ?? c.lastMessageAt,
      unread,
    };
  });
}

export async function openConversationWithFriend(friendUserId: string) {
  const userId = await requireUserId();
  if (!(await areFriends(userId, friendUserId))) {
    return { error: 'You can only message friends. Send a friend request first.' };
  }

  const [userOneId, userTwoId] = orderedUserPair(userId, friendUserId);
  const conversation = await prisma.conversation.upsert({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    update: {},
    create: { userOneId, userTwoId },
  });

  revalidatePath('/messages');
  return { success: true, conversationId: conversation.id };
}

export async function getConversation(conversationId: string) {
  const userId = await requireUserId();
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userOne: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
      userTwo: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
    },
  });

  if (!conversation || (conversation.userOneId !== userId && conversation.userTwoId !== userId)) {
    return { error: 'Conversation not found.' };
  }

  if (!(await areFriends(conversation.userOneId, conversation.userTwoId))) {
    return { error: 'You are no longer friends with this user.' };
  }

  const other = conversation.userOneId === userId ? conversation.userTwo : conversation.userOne;

  // Mark inbound as read first so sender polls pick up read receipts via updatedAt.
  await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: messageSelect,
  });

  return {
    success: true as const,
    conversation: {
      id: conversation.id,
      other,
      messages,
    },
  };
}

/**
 * Sync new messages + edits + read receipts since `sinceIso`
 * (max createdAt/updatedAt the client has seen).
 */
export async function pollConversationMessages(
  conversationId: string,
  sinceIso?: string | null
) {
  const userId = await requireUserId();
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      userOneId: true,
      userTwoId: true,
      userOne: { select: { id: true, e2ePublicKey: true } },
      userTwo: { select: { id: true, e2ePublicKey: true } },
    },
  });

  if (!conversation || (conversation.userOneId !== userId && conversation.userTwoId !== userId)) {
    return { error: 'Conversation not found.' };
  }

  const other = conversation.userOneId === userId ? conversation.userTwo : conversation.userOne;
  const since = sinceIso ? new Date(sinceIso) : null;
  const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

  const messages = await prisma.directMessage.findMany({
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
    select: messageSelect,
  });

  const unreadInbound = messages.filter((m) => m.senderId !== userId && !m.readAt);
  // Also mark any older unread inbound (opened chat but cursor already past them).
  await prisma.directMessage
    .updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })
    .catch(() => null);

  // Re-fetch receipts for outbound messages that were just read by peer in this window.
  let readReceipts: { id: string; readAt: Date }[] = [];
  if (sinceValid) {
    readReceipts = await prisma.directMessage.findMany({
      where: {
        conversationId,
        senderId: userId,
        readAt: { gt: sinceValid },
      },
      select: { id: true, readAt: true },
      take: 80,
    });
  }

  return {
    success: true as const,
    messages,
    readReceipts: readReceipts.map((r) => ({
      id: r.id,
      readAt: r.readAt!,
    })),
    peerPublicKey: other.e2ePublicKey,
  };
}

export async function sendEncryptedMessage(
  conversationId: string,
  ciphertext: string,
  iv: string
) {
  const userId = await requireUserId();

  if (!ciphertext || !iv || ciphertext.length > 20000 || iv.length > 200) {
    return { error: 'Invalid message payload.' };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userOneId: true, userTwoId: true },
  });
  if (!conversation || (conversation.userOneId !== userId && conversation.userTwoId !== userId)) {
    return { error: 'Conversation not found.' };
  }

  const recipientId =
    conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      ciphertext,
      iv,
    },
    select: messageSelect,
  });

  const sideEffects = Promise.all([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    }),
    prisma.user
      .findUnique({
        where: { id: recipientId },
        select: {
          email: true,
          username: true,
          notifyOnMessage: true,
          emailOnMessage: true,
        },
      })
      .then(async (recipient) => {
        if (!recipient) return;
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, name: true },
        });
        if (recipient.notifyOnMessage !== false) {
          await prisma.notification.create({
            data: {
              userId: recipientId,
              type: 'MESSAGE',
              sourceId: userId,
              conversationId,
            },
          });
        }
        if (recipient.emailOnMessage !== false && recipient.email && sender) {
          void sendDirectMessageEmail(
            recipient.email,
            sender.name || sender.username,
            sender.username,
            conversationId
          ).catch(() => null);
        }
      }),
  ]).catch((err) => console.error('Message side effects failed', err));

  void sideEffects;

  return {
    success: true,
    message,
  };
}

/** Replace ciphertext for a message you sent (WhatsApp-style edit). */
export async function editEncryptedMessage(
  messageId: string,
  ciphertext: string,
  iv: string
) {
  const userId = await requireUserId();

  if (!ciphertext || !iv || ciphertext.length > 20000 || iv.length > 200) {
    return { error: 'Invalid message payload.' };
  }

  const existing = await prisma.directMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      senderId: true,
      conversationId: true,
      createdAt: true,
    },
  });

  if (!existing) return { error: 'Message not found.' };
  if (existing.senderId !== userId) return { error: 'You can only edit your own messages.' };

  // Optional soft limit: edits within 24h (WhatsApp-like window).
  const ageMs = Date.now() - new Date(existing.createdAt).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    return { error: 'Messages can only be edited within 24 hours.' };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: existing.conversationId },
    select: { userOneId: true, userTwoId: true },
  });
  if (
    !conversation ||
    (conversation.userOneId !== userId && conversation.userTwoId !== userId)
  ) {
    return { error: 'Conversation not found.' };
  }

  const message = await prisma.directMessage.update({
    where: { id: messageId },
    data: {
      ciphertext,
      iv,
      editedAt: new Date(),
    },
    select: messageSelect,
  });

  return { success: true, message };
}
