import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import ListForm from './ListForm';
import { ListIcon, GamepadIcon, LockIcon, HeartIcon } from '@/components/ui/Icons';

export const metadata = { title: 'My Lists — Savepoint' };

export default async function ListsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).onboarded === false) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.onboarded) redirect('/onboarding');
  }

  const [lists, favoriteGames] = await Promise.all([
    prisma.list.findMany({
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
    }),
    prisma.favoriteGame.findMany({
      where: { userId: session.user.id },
      include: { game: true },
      orderBy: { order: 'asc' },
    })
  ]);

  // Construct a pseudo-list for Favorites to render it seamlessly
  const favoritesList = favoriteGames.length > 0 ? {
    id: 'favorites',
    title: 'Favorite Games',
    description: 'Games you have marked as your all-time favorites.',
    visibility: 'PUBLIC',
    items: favoriteGames,
    _count: { items: favoriteGames.length },
    isSpecial: true,
  } : null;

  const allLists = favoritesList ? [favoritesList, ...lists] : lists;

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

        {allLists.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon"><ListIcon size={48} color="var(--text-muted)" /></div>
            <div className="empty-state-title">No lists yet</div>
            <div className="empty-state-text">Create your first list or favorite a game to curate and share your games.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-xl)' }}>
            {allLists.map((list) => (
              <Link
                key={list.id}
                href={list.id === 'favorites' ? `/profile/${session.user.username}` : `/lists/${list.id}`}
                className="card card-interactive"
                style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden', padding: 0 }}
              >
                {/* Cover mosaic */}
                {/* Cover mosaic */}
                <div style={{
                  height: '160px',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(Math.max(list.items.length, 1), 4)}, 1fr)`,
                  gap: '1px',
                  background: 'var(--bg-surface-hover)',
                  position: 'relative',
                }}>
                  {list.items.slice(0, 4).map((item) => (
                    <div key={item.id} style={{ overflow: 'hidden', height: '100%' }}>
                      {item.game.coverImage ? (
                        <img src={item.game.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)' }} />
                      )}
                    </div>
                  ))}
                  {list.items.length === 0 && (
                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)' }} />
                  )}
                  {/* Overlay gradient */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(13, 13, 26, 1) 0%, rgba(13, 13, 26, 0) 100%)',
                    zIndex: 1,
                  }} />
                  {/* Content positioned over mosaic */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--space-lg)', zIndex: 2 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {(list as any).isSpecial && <HeartIcon size={20} filled color="var(--accent-primary)" />}
                      {list.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><GamepadIcon size={14} /> {list._count.items} games</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {list.visibility === 'PUBLIC' ? 'Public' : <><LockIcon size={12} /> Private</>}
                      </span>
                    </div>
                  </div>
                </div>
                {list.description && (
                  <div style={{ padding: 'var(--space-lg)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
                      {list.description}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </SessionProvider>
  );
}
