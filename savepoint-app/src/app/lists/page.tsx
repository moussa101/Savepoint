import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import ListForm from './ListForm';

export const metadata = { title: 'My Lists — Savepoint' };

export default async function ListsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).onboarded === false) redirect('/onboarding');

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { game: true },
        orderBy: { order: 'asc' },
        take: 6,
      },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">My Lists</h1>
            <p className="page-subtitle">{lists.length} list{lists.length !== 1 ? 's' : ''} created</p>
          </div>
          <ListForm />
        </div>

        {lists.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No lists yet</div>
            <div className="empty-state-text">Create your first list to curate and share your favorite games.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-xl)' }}>
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="card card-interactive"
                style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden', padding: 0 }}
              >
                {/* Cover mosaic */}
                <div style={{
                  height: '140px',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(list.items.length, 4)}, 1fr)`,
                  gap: '2px',
                  background: 'var(--bg-surface-hover)',
                }}>
                  {list.items.slice(0, 4).map((item) => (
                    <div key={item.id} style={{ overflow: 'hidden' }}>
                      {item.game.coverImage && (
                        <img src={item.game.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                  {list.items.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>
                      No games added yet
                    </div>
                  )}
                </div>
                <div style={{ padding: 'var(--space-lg)' }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                    {list.title}
                  </h3>
                  {list.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)' }}>
                      {list.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span>🎮 {list._count.items} games</span>
                    <span className={`badge ${list.visibility === 'PUBLIC' ? 'badge-accent' : ''}`} style={{ fontSize: '0.65rem' }}>
                      {list.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </SessionProvider>
  );
}
