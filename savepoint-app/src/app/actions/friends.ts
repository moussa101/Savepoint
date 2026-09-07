'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { orderedUserPair } from '@/lib/friendship';

function requireUser() {
  return auth().then((session) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user;
  });
}

export async function searchUsers(query: string) {
  const me = await requireUser();
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: me.id } },
        { isBanned: false },
        {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
    },
    take: 20,
    orderBy: { username: 'asc' },
  });

  const ids = users.map((u) => u.id);
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: me.id, addresseeId: { in: ids } },
        { addresseeId: me.id, requesterId: { in: ids } },
      ],
    },
  });

  return users.map((u) => {
    const f = friendships.find(
      (row) =>
        (row.requesterId === me.id && row.addresseeId === u.id) ||
        (row.addresseeId === me.id && row.requesterId === u.id)
    );
    let relation: 'none' | 'friends' | 'outgoing' | 'incoming' = 'none';
    if (f?.status === 'ACCEPTED') relation = 'friends';
    else if (f?.status === 'PENDING' && f.requesterId === me.id) relation = 'outgoing';
    else if (f?.status === 'PENDING' && f.addresseeId === me.id) relation = 'incoming';
    return { ...u, relation, friendshipId: f?.id ?? null };
  });
}

export async function sendFriendRequest(targetUserId: string) {
  const me = await requireUser();
  if (targetUserId === me.id) return { error: 'You can’t friend yourself.' };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isBanned: true },
  });
  if (!target || target.isBanned) return { error: 'User not found.' };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: me.id },
      ],
    },
  });

  if (existing?.status === 'ACCEPTED') return { error: 'You’re already friends.' };
  if (existing?.status === 'PENDING') {
    if (existing.addresseeId === me.id) {
      // Accept instead of creating a duplicate.
      return acceptFriendRequest(existing.id);
    }
    return { error: 'Friend request already sent.' };
  }

  if (existing?.status === 'DECLINED') {
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { requesterId: me.id, addresseeId: targetUserId, status: 'PENDING' },
    });
  } else {
    await prisma.friendship.create({
      data: { requesterId: me.id, addresseeId: targetUserId, status: 'PENDING' },
    });
  }

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: 'FRIEND_REQUEST',
      sourceId: me.id,
    },
  });

  revalidatePath('/friends');
  revalidatePath('/messages');
  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string) {
  const me = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!row || row.addresseeId !== me.id) return { error: 'Request not found.' };
  if (row.status === 'ACCEPTED') return { success: true };

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'ACCEPTED' },
  });

  await prisma.notification.create({
    data: {
      userId: row.requesterId,
      type: 'FRIEND_ACCEPTED',
      sourceId: me.id,
    },
  });

  // Ensure a conversation shell exists.
  const [userOneId, userTwoId] = orderedUserPair(row.requesterId, row.addresseeId);
  await prisma.conversation.upsert({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    update: {},
    create: { userOneId, userTwoId },
  });

  revalidatePath('/friends');
  revalidatePath('/messages');
  return { success: true };
}

export async function declineFriendRequest(friendshipId: string) {
  const me = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!row || row.addresseeId !== me.id) return { error: 'Request not found.' };

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'DECLINED' },
  });

  revalidatePath('/friends');
  return { success: true };
}

export async function removeFriend(friendUserId: string) {
  const me = await requireUser();
  await prisma.friendship.deleteMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me.id, addresseeId: friendUserId },
        { requesterId: friendUserId, addresseeId: me.id },
      ],
    },
  });
  revalidatePath('/friends');
  revalidatePath('/messages');
  return { success: true };
}

export async function getFriendsData() {
  const me = await requireUser();

  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: me.id, status: 'PENDING' },
      include: {
        requester: { select: { id: true, username: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: me.id, status: 'PENDING' },
      include: {
        addressee: { select: { id: true, username: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: me.id }, { addresseeId: me.id }],
      },
      include: {
        requester: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
        addressee: { select: { id: true, username: true, name: true, image: true, e2ePublicKey: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const friends = accepted.map((f) => {
    const other = f.requesterId === me.id ? f.addressee : f.requester;
    return { friendshipId: f.id, user: other };
  });

  return { incoming, outgoing, friends };
}
