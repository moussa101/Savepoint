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
  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      senderId: true,
      ciphertext: true,
      iv: true,
      createdAt: true,
      readAt: true,
    },
  });

  // Mark inbound as read
  await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
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
  });
  if (!conversation || (conversation.userOneId !== userId && conversation.userTwoId !== userId)) {
    return { error: 'Conversation not found.' };
  }

  const recipientId =
    conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;

  if (!(await areFriends(userId, recipientId))) {
    return { error: 'You can only message friends.' };
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      ciphertext,
      iv,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      email: true,
      username: true,
      notifyOnMessage: true,
      emailOnMessage: true,
    },
  });

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });

  if (recipient?.notifyOnMessage !== false) {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'MESSAGE',
        sourceId: userId,
        conversationId,
      },
    });
  }

  if (recipient?.emailOnMessage !== false && recipient?.email && sender) {
    // Fire-and-forget — never include plaintext (we don't have it server-side).
    void sendDirectMessageEmail(
      recipient.email,
      sender.name || sender.username,
      sender.username,
      conversationId
    ).catch(() => null);
  }

  revalidatePath('/messages');
  revalidatePath(`/messages/${conversationId}`);
  return {
    success: true,
    message: {
      id: message.id,
      senderId: message.senderId,
      ciphertext: message.ciphertext,
      iv: message.iv,
      createdAt: message.createdAt,
      readAt: message.readAt,
    },
  };
}
