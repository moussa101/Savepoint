import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ForumBody from '@/components/forum/ForumBody';
import ForumAuthorRow from '@/components/forum/ForumAuthorRow';
import { formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminTopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
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
        },
      },
    },
  });

  if (!topic || topic.forum.slug !== slug) notFound();

  return (
    <div style={{ padding: 'var(--space-2xl)', maxWidth: 900 }}>
      <Link href={`/admin/forums/${slug}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        ← {topic.forum.name}
      </Link>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 8 }}>
        Read-only admin view — posting is disabled for admins
      </p>

      <article className="card" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-lg)' }}>
        <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-md)' }}>
          {topic.title}
        </h1>
        <ForumAuthorRow author={topic.author} subtitle={formatRelativeTime(topic.createdAt)} />
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <ForumBody text={topic.body} />
        </div>
        {topic.imageUrls.map((url) => (
          <img key={url} src={url} alt="" style={{ maxWidth: 280, marginTop: 8, borderRadius: 8 }} />
        ))}
      </article>

      <h2 className="font-display" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>
        {topic.replies.length} replies
      </h2>
      {topic.replies.map((reply) => (
        <article key={reply.id} className="card" style={{ padding: 'var(--space-lg)', marginBottom: 8 }}>
          <ForumAuthorRow author={reply.author} subtitle={formatRelativeTime(reply.createdAt)} />
          <div style={{ marginTop: 12 }}>
            <ForumBody text={reply.body} />
          </div>
        </article>
      ))}
    </div>
  );
}
