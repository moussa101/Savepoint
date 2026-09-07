import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { ForumIcon, PlusIcon } from '@/components/ui/Icons';
import { formatRelativeTime } from '@/lib/utils';
import { ensureReleaseAnnouncement } from '@/lib/ensure-release-announcement';
import { SITE_VERSION } from '@/lib/site-version';
import UserAvatar from '@/components/ui/UserAvatar';

export const metadata = { title: 'Forums — Savepoint' };
export const dynamic = 'force-dynamic';

export default async function ForumsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mine?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as { isAdmin?: boolean }).isAdmin) redirect('/admin/forums');

  const [release, params] = await Promise.all([
    ensureReleaseAnnouncement().catch(() => null),
    searchParams,
  ]);
  const q = (params.q || '').trim();
  const mine = params.mine === '1';

  const where = {
    status: mine ? undefined : { in: ['OPEN', 'CLOSED'] as string[] },
    ...(mine
      ? { members: { some: { userId: session.user.id } }, status: { not: 'DELETED' } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const forums = await prisma.forum.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      owner: { select: { username: true, name: true, image: true, isOfficial: true } },
    },
  });

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">Forums</h1>
            <p className="page-subtitle">Join communities and get help from other players</p>
          </div>
          <Link href="/forums/new" className="btn btn-primary">
            <PlusIcon size={16} /> New forum
          </Link>
        </div>

        {release?.topicId && (
          <Link
            href={`/forums/${release.forumSlug}/${release.topicId}`}
            className="card forum-post"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              marginBottom: 'var(--space-lg)',
              borderColor: 'rgba(0, 229, 160, 0.35)',
              background: 'rgba(0, 229, 160, 0.06)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Official · {SITE_VERSION}
            </div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: 4 }}>
              Savepoint Updates
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Changelog for messaging, PSN sync, forums, and safety tools.
            </p>
          </Link>
        )}

        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Search forums…"
            style={{ flex: 1, minWidth: 0 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
            My forums
          </label>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        {forums.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <ForumIcon size={48} color="var(--text-muted)" />
            </div>
            <div className="empty-state-title">No forums found</div>
            <div className="empty-state-text">Create a community or try a different search.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/forums/${forum.slug}`}
                className="card forum-topic-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <UserAvatar
                  className="avatar"
                  style={{ width: 40, height: 40, flexShrink: 0 }}
                  src={forum.owner.image}
                  name={forum.owner.name}
                  username={forum.owner.username}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                      {forum.name}
                    </h2>
                    <span className="badge">{forum.status}</span>
                  </div>
                  {forum.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '4px 0 6px', lineHeight: 1.4 }}>
                      {forum.description.length > 120
                        ? `${forum.description.slice(0, 120)}…`
                        : forum.description}
                    </p>
                  )}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {forum.owner.name || forum.owner.username}
                    </strong>{' '}
                    @{forum.owner.username} · {forum.memberCount} members · {forum.topicCount} topics ·{' '}
                    {formatRelativeTime(forum.updatedAt)}
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
