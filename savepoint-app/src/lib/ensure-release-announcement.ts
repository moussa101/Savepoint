import { prisma } from '@/lib/db';
import {
  RELEASE_FORUM_SLUG,
  RELEASE_TOPIC_TITLE,
  SITE_VERSION,
} from '@/lib/site-version';

const RELEASE_BODY = `Welcome to Savepoint ${SITE_VERSION}.

This is the official changelog from the Savepoint team. Bookmark this forum for future releases.

## What's in ${SITE_VERSION}

### Messaging
- End-to-end encrypted direct messages (keys stay on your device)
- Group chats with shared encryption, member management, rename & photo
- Images, links, and GIF search in the composer
- Faster message sync and on-device chat cache for snappier reopen
- Profile share cards you can send to friends in one tap

### PlayStation Network
- Connect your PSN account from Settings
- Sync your PlayStation library into Savepoint
- Trophy progress on games and your profile
- Keep library + trophies refreshed as you play

### Forums & community
- Create and join player forums
- Nested replies, votes, pins, and friend invites
- Official Savepoint posts (like this one) carry the green badge

### Safety & moderation
- Report a message or whole conversation
- Chat transcripts (decrypted on the reporter's device) go to mods for review
- Admins can send a Gmail warning with the chat log attached
- Admins can ban from a report in one step

### Accounts
- Reserved names like admin / savepoint are blocked at signup (with a little personality)

## How to try it
1. Open Messages — start a DM or create a group
2. Settings → connect PlayStation if you haven't
3. Forums → join communities or create your own
4. Use Report inside a chat if something crosses the line

## What's next
We're iterating fast. Reply in this forum with bugs, ideas, and what you want next.

— The Savepoint team
`;

/** In-memory gate so hot paths don't hit the DB on every request in this process. */
let cachedTopicId: string | null | undefined;
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Ensures @savepoint is official and the Updates forum + ${SITE_VERSION} topic exist.
 * Cheap after the first success — cached in-process and never rewrites topic body on every load.
 */
export async function ensureReleaseAnnouncement(): Promise<{
  forumSlug: string;
  topicId: string | null;
}> {
  if (cachedTopicId !== undefined && Date.now() - cachedAt < CACHE_MS) {
    return { forumSlug: RELEASE_FORUM_SLUG, topicId: cachedTopicId };
  }

  const existing = await prisma.forumTopic.findFirst({
    where: {
      forum: { slug: RELEASE_FORUM_SLUG },
      title: RELEASE_TOPIC_TITLE,
    },
    select: { id: true },
  });

  if (existing) {
    cachedTopicId = existing.id;
    cachedAt = Date.now();
    return { forumSlug: RELEASE_FORUM_SLUG, topicId: existing.id };
  }

  const savepoint = await prisma.user.findFirst({
    where: { username: { equals: 'savepoint', mode: 'insensitive' } },
    select: { id: true, username: true, isOfficial: true },
  });

  if (!savepoint) {
    cachedTopicId = null;
    cachedAt = Date.now();
    return { forumSlug: RELEASE_FORUM_SLUG, topicId: null };
  }

  if (!savepoint.isOfficial) {
    await prisma.user.update({
      where: { id: savepoint.id },
      data: { isOfficial: true },
    });
  }

  let forum = await prisma.forum.findUnique({
    where: { slug: RELEASE_FORUM_SLUG },
    select: { id: true, slug: true, topicCount: true },
  });

  if (!forum) {
    forum = await prisma.$transaction(async (tx) => {
      const created = await tx.forum.create({
        data: {
          slug: RELEASE_FORUM_SLUG,
          name: 'Savepoint Updates',
          description:
            'Official product updates, changelogs, and release notes from the Savepoint team.',
          ownerId: savepoint.id,
          status: 'OPEN',
          memberCount: 1,
          topicCount: 0,
        },
        select: { id: true, slug: true, topicCount: true },
      });
      await tx.forumMember.create({
        data: {
          forumId: created.id,
          userId: savepoint.id,
          role: 'OWNER',
        },
      });
      return created;
    });
  }

  let topic = await prisma.forumTopic.findFirst({
    where: {
      forumId: forum.id,
      authorId: savepoint.id,
      title: RELEASE_TOPIC_TITLE,
    },
    select: { id: true },
  });

  if (!topic) {
    topic = await prisma.$transaction(async (tx) => {
      const created = await tx.forumTopic.create({
        data: {
          forumId: forum!.id,
          authorId: savepoint.id,
          title: RELEASE_TOPIC_TITLE,
          body: RELEASE_BODY,
          isPinned: true,
          status: 'OPEN',
        },
        select: { id: true },
      });
      await tx.forum.update({
        where: { id: forum!.id },
        data: { topicCount: { increment: 1 }, updatedAt: new Date() },
      });
      return created;
    });
  }

  cachedTopicId = topic.id;
  cachedAt = Date.now();
  return { forumSlug: forum.slug, topicId: topic.id };
}
