import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import { ForumIcon, PlusIcon } from '@/components/ui/Icons';
import { formatRelativeTime } from '@/lib/utils';

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

  const params = await searchParams;
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
      owner: { select: { username: true, name: true } },
    },
  });

  return (
    <SessionProvider>
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

        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Search forums…"
            style={{ flex: 1, minWidth: 200 }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/forums/${forum.slug}`}
                className="card"
                style={{
                  padding: 'var(--space-lg)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', marginBottom: 4 }}>
                      {forum.name}
                    </h2>
                    {forum.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 8 }}>
                        {forum.description.length > 160
                          ? `${forum.description.slice(0, 160)}…`
                          : forum.description}
                      </p>
                    )}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {forum.memberCount} members · {forum.topicCount} topics · by @
                      {forum.owner.username} · {formatRelativeTime(forum.updatedAt)}
                    </div>
                  </div>
                  <span className="badge">{forum.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </SessionProvider>
  );
}
