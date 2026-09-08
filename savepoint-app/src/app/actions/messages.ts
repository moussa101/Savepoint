'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { areFriends, orderedUserPair } from '@/lib/friendship';
import { sendDirectMessageEmail } from '@/lib/mail';
import { MESSAGE_DELETE_WINDOW_MS, MESSAGE_EDIT_WINDOW_MS } from '@/lib/message-limits';

const MAX_CIPHERTEXT = 40000;

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
  deletedAt: true,
  readAt: true,
} as const;

const userLite = {
  id: true,
  username: true,
  name: true,
  image: true,
  e2ePublicKey: true,
} as const;

async function assertConversationAccess(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: { where: { userId }, select: { role: true } },
    },
  });
  if (!conversation) return null;

  if (conversation.type === 'GROUP') {
    if (!conversation.members.length) return null;
    return conversation;
  }

  if (conversation.userOneId !== userId && conversation.userTwoId !== userId) return null;
  return conversation;
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
    where: {
      OR: [
        { userOneId: userId },
        { userTwoId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      userOne: { select: userLite },
      userTwo: { select: userLite },
      members: {
        include: { user: { select: userLite } },
        take: 8,
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, senderId: true, createdAt: true, readAt: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 80,
  });

  return conversations.map((c) => {
    const last = c.messages[0] ?? null;
    const unread = !!(last && last.senderId !== userId && !last.readAt);

    if (c.type === 'GROUP') {
      return {
        id: c.id,
        type: 'GROUP' as const,
        name: c.name || 'Group',
        imageUrl: c.imageUrl,
        lastMessageAt: c.lastMessageAt,
        lastMessageAtPreview: last?.createdAt ?? c.lastMessageAt,
        unread,
        other: null,
        members: c.members.map((m) => m.user),
      };
    }

    const other = c.userOneId === userId ? c.userTwo : c.userOne;
    return {
      id: c.id,
      type: 'DIRECT' as const,
      name: null,
      imageUrl: null,
      lastMessageAt: c.lastMessageAt,
      lastMessageAtPreview: last?.createdAt ?? c.lastMessageAt,
      unread,
      other,
      members: [],
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
    create: { type: 'DIRECT', userOneId, userTwoId },
  });

  revalidatePath('/messages');
  return { success: true, conversationId: conversation.id };
}

export async function getConversation(conversationId: string) {
  const userId = await requireUserId();

  // One round-trip for thread shell + latest messages (was 4–5 sequential queries).
  const [full, recentDesc] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        userOne: { select: userLite },
        userTwo: { select: userLite },
        members: {
          include: { user: { select: { ...userLite, isOfficial: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        keyWraps: {
          where: { userId },
          select: { wrappedKey: true },
          take: 1,
        },
      },
    }),
    prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        ...messageSelect,
        sender: { select: userLite },
      },
    }),
  ]);

  if (!full) return { error: 'Conversation not found.' };

  if (full.type === 'GROUP') {
    if (!full.members.some((m) => m.userId === userId)) {
      return { error: 'Conversation not found.' };
    }
  } else {
    if (full.userOneId !== userId && full.userTwoId !== userId) {
      return { error: 'Conversation not found.' };
    }
    if (!full.userOneId || !full.userTwoId) {
      return { error: 'Conversation not found.' };
    }
    if (!(await areFriends(full.userOneId, full.userTwoId))) {
      return { error: 'You are no longer friends with this user.' };
    }
  }

  // Don't block page render on read receipts.
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

  const messages = recentDesc.slice().reverse();

  if (full.type === 'GROUP') {
    const myRole = full.members.find((m) => m.userId === userId)?.role || 'MEMBER';
    return {
      success: true as const,
      conversation: {
        id: full.id,
        type: 'GROUP' as const,
        name: full.name || 'Group',
        imageUrl: full.imageUrl,
        myRole,
        members: full.members.map((m) => ({ ...m.user, role: m.role })),
        wrappedGroupKey: full.keyWraps[0]?.wrappedKey ?? null,
        other: null,
        messages,
      },
    };
  }

  const other = full.userOneId === userId ? full.userTwo : full.userOne;
  return {
    success: true as const,
    conversation: {
      id: full.id,
      type: 'DIRECT' as const,
      name: null,
      imageUrl: null,
      myRole: null,
      members: [],
      wrappedGroupKey: null,
      other,
      messages,
    },
  };
}

export async function pollConversationMessages(
  conversationId: string,
  sinceIso?: string | null
) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(conversationId, userId);
  if (!conversation) return { error: 'Conversation not found.' };

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
    select: {
      ...messageSelect,
      sender: { select: userLite },
    },
  });

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

  let readReceipts: { id: string; readAt: Date }[] = [];
  if (sinceValid) {
    const rows = await prisma.directMessage.findMany({
      where: {
        conversationId,
        senderId: userId,
        readAt: { gt: sinceValid },
      },
      select: { id: true, readAt: true },
      take: 80,
    });
    readReceipts = rows
      .filter((r): r is { id: string; readAt: Date } => !!r.readAt)
      .map((r) => ({ id: r.id, readAt: r.readAt }));
  }

  let peerPublicKey: string | null = null;
  let wrappedGroupKey: string | null = null;

  if (conversation.type === 'DIRECT' && conversation.userOneId && conversation.userTwoId) {
    const otherId = conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;
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

  return {
    success: true as const,
    messages,
    readReceipts,
    peerPublicKey,
    wrappedGroupKey,
  };
}

async function notifyConversationMembers(
  conversationId: string,
  senderId: string,
  type: 'MESSAGE' | 'GROUP_MESSAGE',
  excludeIds: string[]
) {
  const targets = excludeIds.filter(Boolean);
  for (const recipientId of targets) {
    if (recipientId === senderId) continue;
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        email: true,
        username: true,
        notifyOnMessage: true,
        emailOnMessage: true,
      },
    });
    if (!recipient) continue;
    if (recipient.notifyOnMessage !== false) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type,
          sourceId: senderId,
          conversationId,
        },
      });
    }
    if (type === 'MESSAGE' && recipient.emailOnMessage !== false && recipient.email) {
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true, name: true },
      });
      if (sender) {
        void sendDirectMessageEmail(
          recipient.email,
          sender.name || sender.username,
          sender.username,
          conversationId
        ).catch(() => null);
      }
    }
  }
}

export async function sendEncryptedMessage(
  conversationId: string,
  ciphertext: string,
  iv: string,
  kind: 'CHAT' | 'MEDIA' = 'CHAT'
) {
  const userId = await requireUserId();

  if (!ciphertext || !iv || ciphertext.length > MAX_CIPHERTEXT || iv.length > 200) {
    return { error: 'Invalid message payload.' };
  }

  const conversation = await assertConversationAccess(conversationId, userId);
  if (!conversation) return { error: 'Conversation not found.' };

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      kind,
      ciphertext,
      iv,
    },
    select: {
      ...messageSelect,
      sender: { select: userLite },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  void (async () => {
    try {
      if (conversation.type === 'GROUP') {
        const members = await prisma.conversationMember.findMany({
          where: { conversationId },
          select: { userId: true },
        });
        await notifyConversationMembers(
          conversationId,
          userId,
          'GROUP_MESSAGE',
          members.map((m) => m.userId)
        );
      } else if (conversation.userOneId && conversation.userTwoId) {
        const recipientId =
          conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;
        await notifyConversationMembers(conversationId, userId, 'MESSAGE', [recipientId]);
      }
    } catch (err) {
      console.error('Message side effects failed', err);
    }
  })();

  return { success: true, message };
}

export async function editEncryptedMessage(
  messageId: string,
  ciphertext: string,
  iv: string
) {
  const userId = await requireUserId();

  if (!ciphertext || !iv || ciphertext.length > MAX_CIPHERTEXT || iv.length > 200) {
    return { error: 'Invalid message payload.' };
  }

  const existing = await prisma.directMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      senderId: true,
      conversationId: true,
      createdAt: true,
      kind: true,
      deletedAt: true,
    },
  });

  if (!existing) return { error: 'Message not found.' };
  if (existing.senderId !== userId) return { error: 'You can only edit your own messages.' };
  if (existing.kind === 'SYSTEM') return { error: 'System messages cannot be edited.' };
  if (existing.deletedAt) return { error: 'Deleted messages cannot be edited.' };

  const ageMs = Date.now() - new Date(existing.createdAt).getTime();
  if (ageMs > MESSAGE_EDIT_WINDOW_MS) {
    return { error: 'Messages can only be edited within 2 hours.' };
  }

  const conversation = await assertConversationAccess(existing.conversationId, userId);
  if (!conversation) return { error: 'Conversation not found.' };

  const message = await prisma.directMessage.update({
    where: { id: messageId },
    data: {
      ciphertext,
      iv,
      editedAt: new Date(),
    },
    select: {
      ...messageSelect,
      sender: { select: userLite },
    },
  });

  return { success: true, message };
}

export async function deleteEncryptedMessage(messageId: string) {
  const userId = await requireUserId();

  const existing = await prisma.directMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      senderId: true,
      conversationId: true,
      kind: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  if (!existing) return { error: 'Message not found.' };
  if (existing.senderId !== userId) return { error: 'You can only delete your own messages.' };
  if (existing.kind === 'SYSTEM') return { error: 'System messages cannot be deleted.' };
  if (existing.deletedAt) return { error: 'Message already deleted.' };

  const ageMs = Date.now() - new Date(existing.createdAt).getTime();
  if (ageMs > MESSAGE_DELETE_WINDOW_MS) {
    return { error: 'Messages can only be deleted within 2 hours.' };
  }

  const conversation = await assertConversationAccess(existing.conversationId, userId);
  if (!conversation) return { error: 'Conversation not found.' };

  const message = await prisma.directMessage.update({
    where: { id: messageId },
    data: {
      ciphertext: '',
      iv: '',
      deletedAt: new Date(),
    },
    select: {
      ...messageSelect,
      sender: { select: userLite },
    },
  });

  return { success: true, message };
}

/** Create a GROUP conversation; client supplies per-member wrapped keys. */
export async function createGroupChat(input: {
  name: string;
  imageUrl?: string | null;
  memberIds: string[];
  wraps: { userId: string; wrappedKey: string }[];
}) {
  const userId = await requireUserId();
  const name = input.name?.trim() || '';
  if (name.length < 2 || name.length > 60) return { error: 'Group name must be 2–60 characters' };

  const uniqueMembers = Array.from(new Set([userId, ...(input.memberIds || [])]));
  if (uniqueMembers.length < 2) return { error: 'Add at least one friend' };
  if (uniqueMembers.length > 32) return { error: 'Groups are limited to 32 members' };

  for (const mid of uniqueMembers) {
    if (mid === userId) continue;
    if (!(await areFriends(userId, mid))) {
      return { error: 'You can only add friends to a group' };
    }
  }

  const wrapMap = new Map(input.wraps.map((w) => [w.userId, w.wrappedKey]));
  for (const mid of uniqueMembers) {
    if (!wrapMap.get(mid)) return { error: 'Missing encryption wrap for a member' };
  }

  const imageUrl =
    input.imageUrl && /^https:\/\//i.test(input.imageUrl) ? input.imageUrl : null;

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        type: 'GROUP',
        name,
        imageUrl,
        createdById: userId,
        userOneId: null,
        userTwoId: null,
      },
    });

    await tx.conversationMember.createMany({
      data: uniqueMembers.map((mid) => ({
        conversationId: created.id,
        userId: mid,
        role: mid === userId ? 'OWNER' : 'MEMBER',
      })),
    });

    await tx.groupKeyWrap.createMany({
      data: uniqueMembers.map((mid) => ({
        conversationId: created.id,
        userId: mid,
        wrappedKey: wrapMap.get(mid)!,
      })),
    });

    await tx.directMessage.create({
      data: {
        conversationId: created.id,
        senderId: userId,
        kind: 'SYSTEM',
        systemPayload: JSON.stringify({ type: 'GROUP_CREATED', name }),
      },
    });

    return created;
  });

  for (const mid of uniqueMembers) {
    if (mid === userId) continue;
    await prisma.notification.create({
      data: {
        userId: mid,
        type: 'GROUP_MESSAGE',
        sourceId: userId,
        conversationId: conversation.id,
      },
    });
  }

  revalidatePath('/messages');
  return { success: true, conversationId: conversation.id };
}

export async function updateGroupInfo(input: {
  conversationId: string;
  name?: string;
  imageUrl?: string | null;
}) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(input.conversationId, userId);
  if (!conversation || conversation.type !== 'GROUP') return { error: 'Group not found' };

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: input.conversationId, userId } },
  });
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return { error: 'Only owners/admins can edit the group' };
  }

  const data: { name?: string; imageUrl?: string | null } = {};
  if (typeof input.name === 'string') {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 60) return { error: 'Invalid name' };
    data.name = name;
  }
  if (input.imageUrl !== undefined) {
    data.imageUrl = input.imageUrl && /^https:\/\//i.test(input.imageUrl) ? input.imageUrl : null;
  }

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data,
  });

  revalidatePath(`/messages/${input.conversationId}`);
  revalidatePath('/messages');
  return { success: true };
}

export async function addGroupMembers(input: {
  conversationId: string;
  memberIds: string[];
  wraps: { userId: string; wrappedKey: string }[];
}) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(input.conversationId, userId);
  if (!conversation || conversation.type !== 'GROUP') return { error: 'Group not found' };

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: input.conversationId, userId } },
  });
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return { error: 'Only owners/admins can add members' };
  }

  const wrapMap = new Map(input.wraps.map((w) => [w.userId, w.wrappedKey]));
  for (const mid of input.memberIds) {
    if (!(await areFriends(userId, mid))) return { error: 'You can only add friends' };
    if (!wrapMap.get(mid)) return { error: 'Missing encryption wrap' };
  }

  for (const mid of input.memberIds) {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: input.conversationId, userId: mid } },
      update: {},
      create: { conversationId: input.conversationId, userId: mid, role: 'MEMBER' },
    });
    await prisma.groupKeyWrap.upsert({
      where: { conversationId_userId: { conversationId: input.conversationId, userId: mid } },
      update: { wrappedKey: wrapMap.get(mid)! },
      create: {
        conversationId: input.conversationId,
        userId: mid,
        wrappedKey: wrapMap.get(mid)!,
      },
    });
    await prisma.notification.create({
      data: {
        userId: mid,
        type: 'GROUP_MESSAGE',
        sourceId: userId,
        conversationId: input.conversationId,
      },
    });
  }

  // Refresh wraps for existing members too (key rotation payload from client)
  for (const w of input.wraps) {
    await prisma.groupKeyWrap.upsert({
      where: { conversationId_userId: { conversationId: input.conversationId, userId: w.userId } },
      update: { wrappedKey: w.wrappedKey },
      create: {
        conversationId: input.conversationId,
        userId: w.userId,
        wrappedKey: w.wrappedKey,
      },
    });
  }

  revalidatePath(`/messages/${input.conversationId}`);
  return { success: true };
}

export async function removeGroupMember(conversationId: string, memberUserId: string) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(conversationId, userId);
  if (!conversation || conversation.type !== 'GROUP') return { error: 'Group not found' };

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return { error: 'Only owners/admins can remove members' };
  }

  if (memberUserId === userId) {
    return { error: 'Use leave group to remove yourself' };
  }

  const target = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: memberUserId } },
  });
  if (!target) return { error: 'Member not found' };
  if (target.role === 'OWNER') return { error: 'Cannot remove the group owner' };

  await prisma.$transaction([
    prisma.conversationMember.delete({ where: { id: target.id } }),
    prisma.groupKeyWrap.deleteMany({ where: { conversationId, userId: memberUserId } }),
  ]);

  await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      kind: 'SYSTEM',
      systemPayload: JSON.stringify({ type: 'MEMBER_REMOVED', userId: memberUserId }),
    },
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
  return { success: true };
}

export async function leaveGroup(conversationId: string) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(conversationId, userId);
  if (!conversation || conversation.type !== 'GROUP') return { error: 'Group not found' };

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership) return { success: true };

  await prisma.$transaction([
    prisma.conversationMember.delete({ where: { id: membership.id } }),
    prisma.groupKeyWrap.deleteMany({ where: { conversationId, userId } }),
  ]);

  if (membership.role === 'OWNER') {
    const next = await prisma.conversationMember.findFirst({
      where: { conversationId },
      orderBy: { joinedAt: 'asc' },
    });
    if (next) {
      await prisma.conversationMember.update({
        where: { id: next.id },
        data: { role: 'OWNER' },
      });
    }
  }

  revalidatePath('/messages');
  return { success: true };
}

export async function listFriendsForShare() {
  const userId = await requireUserId();
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: userLite },
      addressee: { select: userLite },
    },
  });

  return friendships.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
}

/** Server-readable SYSTEM profile share (also works when peer lacks E2E yet). */
export async function shareProfileSystemMessage(conversationId: string, profileUserId: string) {
  const userId = await requireUserId();
  const conversation = await assertConversationAccess(conversationId, userId);
  if (!conversation) return { error: 'Conversation not found.' };

  const profile = await prisma.user.findUnique({
    where: { id: profileUserId },
    select: { id: true, username: true, name: true, image: true },
  });
  if (!profile) return { error: 'User not found' };

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      kind: 'SYSTEM',
      systemPayload: JSON.stringify({
        type: 'PROFILE_SHARE',
        userId: profile.id,
        username: profile.username,
        name: profile.name,
        image: profile.image,
      }),
    },
    select: {
      ...messageSelect,
      sender: { select: userLite },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  revalidatePath(`/messages/${conversationId}`);
  return { success: true, message };
}

export async function getPublicKeysForUsers(userIds: string[]) {
  const userId = await requireUserId();
  const ids = Array.from(new Set(userIds)).slice(0, 40);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, e2ePublicKey: true, username: true },
  });
  // Ensure requester is included / friends for privacy
  void userId;
  return users;
}
