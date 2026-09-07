import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatRelativeTime } from '@/lib/utils';
import AdminDeleteForum from './AdminDeleteForum';

export const metadata = { title: 'Forums — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminForumsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || 'ALL';

  const forums = await prisma.forum.findMany({
    where: statusFilter === 'ALL' ? undefined : { status: statusFilter },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      owner: { select: { username: true } },
      deletedBy: { select: { username: true } },
      _count: { select: { topics: true, members: true } },
    },
  });

  const statuses = ['ALL', 'OPEN', 'CLOSED', 'ARCHIVED', 'DELETED'];

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
          Forum monitor
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          View and soft-delete forums. Admins cannot join or post.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-xl)' }}>
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/admin/forums' : `/admin/forums?status=${s}`}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-surface-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Forum</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Owner</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Stats</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Updated</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forums.map((forum) => (
              <tr key={forum.id} style={{ borderBottom: '1px solid var(--bg-surface-border)' }}>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                  <Link href={`/admin/forums/${forum.slug}`} style={{ color: 'inherit', fontWeight: 600 }}>
                    {forum.name}
                  </Link>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/{forum.slug}</div>
                  {forum.status === 'DELETED' && forum.deletedReason && (
                    <div style={{ fontSize: 'var(--text-xs)', color: '#eb5757', marginTop: 4 }}>
                      Reason: {forum.deletedReason}
                      {forum.deletedBy ? ` (@${forum.deletedBy.username})` : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                  <span className="badge">{forum.status}</span>
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>@{forum.owner.username}</td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>
                  {forum._count.members} members · {forum._count.topics} topics
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>
                  {formatRelativeTime(forum.updatedAt)}
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Link href={`/admin/forums/${forum.slug}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                    {forum.status !== 'DELETED' && <AdminDeleteForum forumId={forum.id} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {forums.length === 0 && (
          <p style={{ padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No forums in this filter.</p>
        )}
      </div>
    </div>
  );
}
