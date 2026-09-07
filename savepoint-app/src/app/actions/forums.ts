'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

const ADMIN_PARTICIPATE_BLOCK = 'Admins can monitor forums but cannot participate.';
const MAX_IMAGES = 4;
const MAX_TITLE = 160;
const MAX_BODY = 20000;
const MAX_NAME = 80;
const MAX_DESC = 2000;

type ActionResult = { success: true; slug?: string; topicId?: string } | { error: string };

async function getActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true, isBanned: true, username: true },
  });
  if (!user || user.isBanned) return null;
  return user;
}

function rejectAdminParticipate(user: { isAdmin: boolean }): ActionResult | null {
  if (user.isAdmin) return { error: ADMIN_PARTICIPATE_BLOCK };
  return null;
}

function parseImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === 'string' && /^https:\/\//i.test(u))
    .slice(0, MAX_IMAGES);
}

async function uniqueForumSlug(base: string): Promise<string> {
  let slug = slugify(base) || 'forum';
  if (slug.length > 60) slug = slug.slice(0, 60);
  let candidate = slug;
  let n = 0;
  while (await prisma.forum.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${slug}-${n}`;
  }
  return candidate;
}

export async function createForum(input: {
  name: string;
  description?: string;
  coverImage?: string;
}): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  // Admins may create/own for ops, but cannot post later.

  const name = input.name?.trim() || '';
  if (name.length < 3 || name.length > MAX_NAME) {
    return { error: `Name must be 3–${MAX_NAME} characters` };
  }
  const description = input.description?.trim().slice(0, MAX_DESC) || null;
  const coverImage =
    input.coverImage && /^https:\/\//i.test(input.coverImage) ? input.coverImage : null;

  const slug = await uniqueForumSlug(name);

  const forum = await prisma.$transaction(async (tx) => {
    const created = await tx.forum.create({
      data: {
        slug,
        name,
        description,
        coverImage,
        ownerId: user.id,
        status: 'OPEN',
        memberCount: 1,
      },
    });
    await tx.forumMember.create({
      data: {
        forumId: created.id,
        userId: user.id,
        role: 'OWNER',
      },
    });
    return created;
  });

  revalidatePath('/forums');
  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath('/admin/forums');
  return { success: true, slug: forum.slug };
}

export async function joinForum(forumId: string): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum || forum.status === 'DELETED') return { error: 'Forum not found' };
  if (forum.status === 'ARCHIVED') return { error: 'This forum is archived' };

  const existing = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId, userId: user.id } },
  });
  if (existing) return { success: true, slug: forum.slug };

  await prisma.$transaction([
    prisma.forumMember.create({
      data: { forumId, userId: user.id, role: 'MEMBER' },
    }),
    prisma.forum.update({
      where: { id: forumId },
      data: { memberCount: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath('/forums');
  return { success: true, slug: forum.slug };
}

export async function leaveForum(forumId: string): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };

  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum || forum.status === 'DELETED') return { error: 'Forum not found' };
  if (forum.ownerId === user.id) return { error: 'Owners cannot leave. Transfer or delete the forum.' };

  const membership = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId, userId: user.id } },
  });
  if (!membership) return { success: true, slug: forum.slug };

  await prisma.$transaction([
    prisma.forumMember.delete({ where: { id: membership.id } }),
    prisma.forum.update({
      where: { id: forumId },
      data: { memberCount: { decrement: 1 } },
    }),
  ]);

  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath('/forums');
  return { success: true, slug: forum.slug };
}

export async function createTopic(input: {
  forumId: string;
  title: string;
  body: string;
  imageUrls?: string[];
}): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const forum = await prisma.forum.findUnique({ where: { id: input.forumId } });
  if (!forum || forum.status === 'DELETED') return { error: 'Forum not found' };
  if (forum.status !== 'OPEN') return { error: 'This forum is not accepting new topics' };

  const member = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId: forum.id, userId: user.id } },
  });
  if (!member) return { error: 'Join the forum to post' };

  const title = input.title?.trim() || '';
  const body = input.body?.trim() || '';
  if (title.length < 3 || title.length > MAX_TITLE) {
    return { error: `Title must be 3–${MAX_TITLE} characters` };
  }
  if (body.length < 1 || body.length > MAX_BODY) {
    return { error: `Body must be 1–${MAX_BODY} characters` };
  }

  const imageUrls = parseImageUrls(input.imageUrls);

  const topic = await prisma.$transaction(async (tx) => {
    const created = await tx.forumTopic.create({
      data: {
        forumId: forum.id,
        authorId: user.id,
        title,
        body,
        imageUrls,
        status: 'OPEN',
      },
    });
    await tx.forum.update({
      where: { id: forum.id },
      data: { topicCount: { increment: 1 } },
    });
    return created;
  });

  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath(`/forums/${forum.slug}/${topic.id}`);
  return { success: true, slug: forum.slug, topicId: topic.id };
}

export async function createReply(input: {
  topicId: string;
  body: string;
  imageUrls?: string[];
  parentId?: string | null;
}): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const topic = await prisma.forumTopic.findUnique({
    where: { id: input.topicId },
    include: { forum: true },
  });
  if (!topic || topic.forum.status === 'DELETED') return { error: 'Topic not found' };
  if (topic.forum.status !== 'OPEN') return { error: 'This forum is closed' };
  if (topic.status === 'CLOSED') return { error: 'This topic is closed' };

  const member = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId: topic.forumId, userId: user.id } },
  });
  if (!member) return { error: 'Join the forum to reply' };

  const body = input.body?.trim() || '';
  if (body.length < 1 || body.length > MAX_BODY) {
    return { error: `Body must be 1–${MAX_BODY} characters` };
  }

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.forumReply.findUnique({
      where: { id: input.parentId },
      select: { id: true, topicId: true, parentId: true },
    });
    if (!parent || parent.topicId !== topic.id) return { error: 'Parent reply not found' };
    // Limit nesting depth to 3 (top -> child -> grandchild)
    let depth = 1;
    let cursor = parent.parentId;
    while (cursor && depth < 4) {
      const up = await prisma.forumReply.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      depth += 1;
      cursor = up?.parentId ?? null;
    }
    if (depth >= 3) return { error: 'Reply nesting limit reached' };
    parentId = parent.id;
  }

  const imageUrls = parseImageUrls(input.imageUrls);

  await prisma.forumReply.create({
    data: {
      topicId: topic.id,
      authorId: user.id,
      parentId,
      body,
      imageUrls,
    },
  });

  revalidatePath(`/forums/${topic.forum.slug}/${topic.id}`);
  return { success: true, slug: topic.forum.slug, topicId: topic.id };
}

export async function closeForum(forumId: string): Promise<ActionResult> {
  return setForumStatus(forumId, 'CLOSED', true);
}

export async function archiveForum(forumId: string): Promise<ActionResult> {
  return setForumStatus(forumId, 'ARCHIVED', true);
}

export async function reopenForum(forumId: string): Promise<ActionResult> {
  return setForumStatus(forumId, 'OPEN', true);
}

async function setForumStatus(
  forumId: string,
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED',
  ownerOnly: boolean
): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };

  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum || forum.status === 'DELETED') return { error: 'Forum not found' };
  if (ownerOnly && forum.ownerId !== user.id) return { error: 'Only the owner can do that' };

  await prisma.forum.update({
    where: { id: forumId },
    data: { status },
  });

  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath('/forums');
  revalidatePath('/admin/forums');
  return { success: true, slug: forum.slug };
}

export async function deleteForum(forumId: string, reason: string): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };

  const trimmed = reason?.trim() || '';
  if (trimmed.length < 3) return { error: 'A deletion reason is required' };

  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum) return { error: 'Forum not found' };
  if (forum.status === 'DELETED') return { success: true, slug: forum.slug };

  const isOwner = forum.ownerId === user.id;
  if (!isOwner && !user.isAdmin) return { error: 'Not allowed' };

  await prisma.forum.update({
    where: { id: forumId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedReason: trimmed.slice(0, 2000),
      deletedById: user.id,
    },
  });

  revalidatePath(`/forums/${forum.slug}`);
  revalidatePath('/forums');
  revalidatePath('/admin/forums');
  return { success: true, slug: forum.slug };
}

export async function closeTopic(topicId: string): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };

  const topic = await prisma.forumTopic.findUnique({
    where: { id: topicId },
    include: { forum: true },
  });
  if (!topic || topic.forum.status === 'DELETED') return { error: 'Topic not found' };

  const isAuthor = topic.authorId === user.id;
  const isOwner = topic.forum.ownerId === user.id;
  if (!isAuthor && !isOwner) return { error: 'Not allowed' };

  await prisma.forumTopic.update({
    where: { id: topicId },
    data: { status: 'CLOSED' },
  });

  revalidatePath(`/forums/${topic.forum.slug}/${topic.id}`);
  return { success: true, slug: topic.forum.slug, topicId: topic.id };
}

export async function voteTopic(topicId: string, value: 1 | -1): Promise<ActionResult & { score?: number }> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const topic = await prisma.forumTopic.findUnique({
    where: { id: topicId },
    include: { forum: true },
  });
  if (!topic || topic.forum.status === 'DELETED') return { error: 'Topic not found' };

  const existing = await prisma.forumTopicVote.findUnique({
    where: { topicId_userId: { topicId, userId: user.id } },
  });

  let delta = 0;
  if (!existing) {
    await prisma.forumTopicVote.create({ data: { topicId, userId: user.id, value } });
    delta = value;
  } else if (existing.value === value) {
    await prisma.forumTopicVote.delete({ where: { id: existing.id } });
    delta = -value;
  } else {
    await prisma.forumTopicVote.update({ where: { id: existing.id }, data: { value } });
    delta = value - existing.value;
  }

  const updated = await prisma.forumTopic.update({
    where: { id: topicId },
    data: { score: { increment: delta } },
    select: { score: true },
  });

  revalidatePath(`/forums/${topic.forum.slug}`);
  revalidatePath(`/forums/${topic.forum.slug}/${topic.id}`);
  return { success: true, slug: topic.forum.slug, topicId: topic.id, score: updated.score };
}

export async function voteReply(replyId: string, value: 1 | -1): Promise<ActionResult & { score?: number }> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const reply = await prisma.forumReply.findUnique({
    where: { id: replyId },
    include: { topic: { include: { forum: true } } },
  });
  if (!reply || reply.topic.forum.status === 'DELETED') return { error: 'Reply not found' };

  const existing = await prisma.forumReplyVote.findUnique({
    where: { replyId_userId: { replyId, userId: user.id } },
  });

  let delta = 0;
  if (!existing) {
    await prisma.forumReplyVote.create({ data: { replyId, userId: user.id, value } });
    delta = value;
  } else if (existing.value === value) {
    await prisma.forumReplyVote.delete({ where: { id: existing.id } });
    delta = -value;
  } else {
    await prisma.forumReplyVote.update({ where: { id: existing.id }, data: { value } });
    delta = value - existing.value;
  }

  const updated = await prisma.forumReply.update({
    where: { id: replyId },
    data: { score: { increment: delta } },
    select: { score: true },
  });

  revalidatePath(`/forums/${reply.topic.forum.slug}/${reply.topicId}`);
  return {
    success: true,
    slug: reply.topic.forum.slug,
    topicId: reply.topicId,
    score: updated.score,
  };
}

export async function pinTopic(topicId: string, pinned: boolean): Promise<ActionResult> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };

  const topic = await prisma.forumTopic.findUnique({
    where: { id: topicId },
    include: { forum: true },
  });
  if (!topic || topic.forum.status === 'DELETED') return { error: 'Topic not found' };
  if (topic.forum.ownerId !== user.id) return { error: 'Only the forum owner can pin topics' };

  await prisma.forumTopic.update({
    where: { id: topicId },
    data: {
      isPinned: pinned,
      pinnedAt: pinned ? new Date() : null,
    },
  });

  revalidatePath(`/forums/${topic.forum.slug}`);
  revalidatePath(`/forums/${topic.forum.slug}/${topic.id}`);
  return { success: true, slug: topic.forum.slug, topicId: topic.id };
}

export async function inviteFriendToForum(
  forumId: string,
  friendUserId: string
): Promise<ActionResult & { conversationId?: string }> {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' };
  const blocked = rejectAdminParticipate(user);
  if (blocked) return blocked;

  const { areFriends, orderedUserPair } = await import('@/lib/friendship');
  if (!(await areFriends(user.id, friendUserId))) {
    return { error: 'You can only invite friends' };
  }

  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum || forum.status === 'DELETED' || forum.status === 'ARCHIVED') {
    return { error: 'Forum not found' };
  }

  const membership = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId, userId: user.id } },
  });
  if (!membership) return { error: 'Join the forum before inviting friends' };

  if (friendUserId === user.id) return { error: 'Cannot invite yourself' };

  const already = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId, userId: friendUserId } },
  });
  if (already) return { error: 'They are already a member' };

  const [userOneId, userTwoId] = orderedUserPair(user.id, friendUserId);
  const conversation = await prisma.conversation.upsert({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    update: { lastMessageAt: new Date() },
    create: { userOneId, userTwoId },
  });

  const payload = JSON.stringify({
    type: 'FORUM_INVITE',
    forumId: forum.id,
    forumSlug: forum.slug,
    forumName: forum.name,
  });

  await prisma.$transaction([
    prisma.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        kind: 'SYSTEM',
        ciphertext: '',
        iv: '',
        systemPayload: payload,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: friendUserId,
        type: 'FORUM_INVITE',
        sourceId: user.id,
        forumId: forum.id,
        conversationId: conversation.id,
      },
    }),
  ]);

  revalidatePath('/messages');
  revalidatePath(`/messages/${conversation.id}`);
  return { success: true, slug: forum.slug, conversationId: conversation.id };
}

export async function listInviteableFriends(forumId: string) {
  const user = await getActor();
  if (!user) return { error: 'Unauthorized' as const, friends: [] as FriendLite[] };

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
    include: {
      requester: { select: { id: true, username: true, name: true, image: true } },
      addressee: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const memberIds = new Set(
    (
      await prisma.forumMember.findMany({
        where: { forumId },
        select: { userId: true },
      })
    ).map((m) => m.userId)
  );

  const friends: FriendLite[] = friendships
    .map((f) => (f.requesterId === user.id ? f.addressee : f.requester))
    .filter((f) => !memberIds.has(f.id));

  return { success: true as const, friends };
}

type FriendLite = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};
