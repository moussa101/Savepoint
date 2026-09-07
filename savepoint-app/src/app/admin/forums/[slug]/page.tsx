import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatRelativeTime } from '@/lib/utils';
import ForumBody from '@/components/forum/ForumBody';
import AdminDeleteForum from '../AdminDeleteForum';

export const dynamic = 'force-dynamic';

export default async function AdminForumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const forum = await prisma.forum.findUnique({
    where: { slug },
    include: {
      owner: { select: { username: true } },
      deletedBy: { select: { username: true } },
      topics: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true } },
          _count: { select: { replies: true } },
        },
      },
    },
  });

  if (!forum) notFound();

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <Link href="/admin/forums" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        ← All forums
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', margin: 'var(--space-lg) 0' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)' }}>
            {forum.name}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            @{forum.owner.username} · <span className="badge">{forum.status}</span>
          </p>
          {forum.description && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <ForumBody text={forum.description} />
            </div>
          )}
          {forum.status === 'DELETED' && (
            <p style={{ color: '#eb5757', marginTop: 8 }}>
              Deleted: {forum.deletedReason}
              {forum.deletedBy ? ` (@${forum.deletedBy.username})` : ''}
            </p>
          )}
        </div>
        {forum.status !== 'DELETED' && <AdminDeleteForum forumId={forum.id} />}
      </div>

      <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>
        Topics (read-only)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {forum.topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/admin/forums/${forum.slug}/${topic.id}`}
            className="card"
            style={{ padding: 'var(--space-md)', textDecoration: 'none', color: 'inherit' }}
          >
            <strong>{topic.title}</strong>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              @{topic.author.username} · {topic._count.replies} replies · {formatRelativeTime(topic.createdAt)}
            </div>
          </Link>
        ))}
        {forum.topics.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No topics.</p>
        )}
      </div>
    </div>
  );
}
