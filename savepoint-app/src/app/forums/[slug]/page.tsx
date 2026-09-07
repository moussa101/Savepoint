import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ReportButton from '@/components/ui/ReportButton';
import { formatRelativeTime } from '@/lib/utils';
import { ForumOwnerControls, JoinLeaveButton } from './ForumControls';
import NewTopicForm from './NewTopicForm';
import ForumAuthorRow from '@/components/forum/ForumAuthorRow';
import InviteFriendsButton from '@/components/forum/InviteFriendsButton';
import { PinIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const forum = await prisma.forum.findUnique({ where: { slug }, select: { name: true } });
  return { title: forum ? `${forum.name} — Forums` : 'Forum — Savepoint' };
}

export default async function ForumPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const isAdmin = !!(session.user as { isAdmin?: boolean }).isAdmin;
  if (isAdmin) {
    const { slug } = await params;
    redirect(`/admin/forums/${slug}`);
  }

  const { slug } = await params;
  const forum = await prisma.forum.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isOfficial: true,
        },
      },
      deletedBy: { select: { username: true } },
    },
  });

  if (!forum) notFound();

  const membership = await prisma.forumMember.findUnique({
    where: { forumId_userId: { forumId: forum.id, userId: session.user.id } },
  });

  const isOwner = forum.ownerId === session.user.id;
  const isMember = !!membership;

  if (forum.status === 'DELETED') {
    return (
      <>
        <Navbar />
        <Sidebar />
        <main className="main-with-sidebar">
          <div className="card" style={{ padding: 'var(--space-2xl)', maxWidth: 640 }}>
            <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 8 }}>
              {forum.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
              This forum was removed
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
              <strong>Reason:</strong> {forum.deletedReason || 'No reason provided'}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {forum.deletedAt ? formatRelativeTime(forum.deletedAt) : ''}
              {forum.deletedBy ? ` · by @${forum.deletedBy.username}` : ''}
            </p>
            <Link href="/forums" className="btn btn-secondary" style={{ marginTop: 'var(--space-xl)' }}>
              Back to forums
            </Link>
          </div>
        </main>
      </>
    );
  }

  const topics =
    forum.status === 'ARCHIVED' && !isMember
      ? []
      : await prisma.forumTopic.findMany({
          where: { forumId: forum.id },
          orderBy: [{ isPinned: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }],
          take: 50,
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
            _count: { select: { replies: true } },
          },
        });

  const canPost = isMember && forum.status === 'OPEN';

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 className="page-title font-display" style={{ margin: 0 }}>
                {forum.name}
              </h1>
              <span className="badge">{forum.status}</span>
            </div>
            {forum.description && (
              <p className="page-subtitle" style={{ marginBottom: 'var(--space-md)' }}>
                {forum.description}
              </p>
            )}
            <ForumAuthorRow author={forum.owner} subtitle="Owner" />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
              {forum.memberCount} members · {forum.topicCount} topics
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <JoinLeaveButton forumId={forum.id} isMember={isMember} isOwner={isOwner} />
            {isMember && <InviteFriendsButton forumId={forum.id} />}
            <ReportButton targetType="FORUM" targetId={forum.id} reportedUserId={forum.ownerId} />
            {isOwner && <ForumOwnerControls forumId={forum.id} />}
          </div>
        </div>

        {canPost && <NewTopicForm forumId={forum.id} />}

        {!isMember && forum.status === 'OPEN' && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
            Join this forum to ask questions and reply.
          </p>
        )}

        {topics.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-title">No topics yet</div>
            <div className="empty-state-text">Be the first to ask for help.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/forums/${forum.slug}/${topic.id}`}
                className="card forum-topic-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <UserAvatar
                  className="avatar"
                  style={{ width: 40, height: 40, flexShrink: 0 }}
                  src={topic.author.image}
                  name={topic.author.name}
                  username={topic.author.username}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {topic.isPinned && <PinIcon size={14} color="var(--accent-primary)" />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.title}</span>
                  </h2>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                    <span>
                      <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {topic.author.name || topic.author.username}
                      </strong>{' '}
                      @{topic.author.username}
                    </span>
                    <span>{topic.score} pts</span>
                    <span>{topic._count.replies} replies</span>
                    <span>{formatRelativeTime(topic.createdAt)}</span>
                    {topic.status === 'CLOSED' ? <span>Closed</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
