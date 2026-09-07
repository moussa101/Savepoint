import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import ForumBody from '@/components/forum/ForumBody';
import ForumAuthorRow from '@/components/forum/ForumAuthorRow';
import { PostActionBar, VoteButtons } from '@/components/forum/ForumPostActions';
import { formatRelativeTime } from '@/lib/utils';
import { PinIcon } from '@/components/ui/Icons';
import { CloseTopicButton, ReplyForm } from './TopicActions';
import { ReplyTree, type ReplyNode } from './ReplyTree';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = await prisma.forumTopic.findUnique({ where: { id: topicId }, select: { title: true } });
  return { title: topic ? `${topic.title} — Forums` : 'Topic — Savepoint' };
}

function buildReplyTree(
  flat: Array<{
    id: string;
    body: string;
    imageUrls: string[];
    score: number;
    createdAt: Date;
    authorId: string;
    parentId: string | null;
    author: ReplyNode['author'];
    votes: { value: number }[];
  }>
): ReplyNode[] {
  const nodes = new Map<string, ReplyNode>();
  for (const r of flat) {
    nodes.set(r.id, {
      id: r.id,
      body: r.body,
      imageUrls: r.imageUrls,
      score: r.score,
      createdAt: r.createdAt,
      authorId: r.authorId,
      parentId: r.parentId,
      author: r.author,
      myVote: r.votes[0]?.value ?? null,
      children: [],
    });
  }
  const roots: ReplyNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (list: ReplyNode[]) => {
    list.sort((a, b) => b.score - a.score || +new Date(a.createdAt) - +new Date(b.createdAt));
    list.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(roots);
  return roots;
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as { isAdmin?: boolean }).isAdmin) {
    const { slug, topicId } = await params;
    redirect(`/admin/forums/${slug}/${topicId}`);
  }

  const { slug, topicId } = await params;

  const topic = await prisma.forumTopic.findUnique({
    where: { id: topicId },
    include: {
      forum: true,
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isOfficial: true,
        },
      },
      votes: {
        where: { userId: session.user.id },
        select: { value: true },
        take: 1,
      },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              isVerified: true,
              isOfficial: true,
            },
          },
          votes: {
            where: { userId: session.user.id },
            select: { value: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!topic || topic.forum.slug !== slug) notFound();
  if (topic.forum.status === 'DELETED') redirect(`/forums/${slug}`);

  const membership = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId: topic.forumId, userId: session.user.id } },
  });

  const isMember = !!membership;
  const isOwner = topic.forum.ownerId === session.user.id;
  const canReply = isMember && topic.forum.status === 'OPEN' && topic.status === 'OPEN';
  const canClose =
    topic.status === 'OPEN' &&
    (topic.authorId === session.user.id || isOwner);

  const replyTree = buildReplyTree(topic.replies);
  const topLevelCount = topic.replies.filter((r) => !r.parentId).length;
  const sharePath = `/forums/${slug}/${topic.id}`;

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <Link
          href={`/forums/${slug}`}
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', display: 'inline-block' }}
        >
          ← {topic.forum.name}
        </Link>

        <article className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <VoteButtons
              kind="topic"
              id={topic.id}
              score={topic.score}
              myVote={topic.votes[0]?.value ?? null}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {topic.isPinned && <PinIcon size={18} color="var(--accent-primary)" />}
                  {topic.title}
                </h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {topic.status === 'CLOSED' && <span className="badge">Closed</span>}
                  {canClose && <CloseTopicButton topicId={topic.id} />}
                </div>
              </div>
              <ForumAuthorRow author={topic.author} subtitle={formatRelativeTime(topic.createdAt)} />
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <ForumBody text={topic.body} />
              </div>
              {topic.imageUrls.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'var(--space-md)' }}>
                  {topic.imageUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              )}
              <PostActionBar
                sharePath={sharePath}
                reportType="FORUM_TOPIC"
                reportId={topic.id}
                reportedUserId={topic.authorId}
                pin={isOwner ? { topicId: topic.id, isPinned: topic.isPinned } : undefined}
              />
            </div>
          </div>
        </article>

        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>
          {topLevelCount} {topLevelCount === 1 ? 'answer' : 'answers'}
        </h2>

        <ReplyTree replies={replyTree} topicId={topic.id} forumSlug={slug} canReply={canReply} />

        {canReply ? (
          <ReplyForm topicId={topic.id} />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xl)' }}>
            {topic.status === 'CLOSED'
              ? 'This topic is closed.'
              : !isMember
                ? 'Join the forum to reply.'
                : 'Replies are not available right now.'}
          </p>
        )}
      </main>
    </SessionProvider>
  );
}
