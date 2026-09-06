import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import ListForm from './ListForm';
import ListCard from '@/components/ui/ListCard';
import { ListIcon } from '@/components/ui/Icons';

export const metadata = { title: 'My Lists — Savepoint' };

export default async function ListsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).onboarded === false) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.onboarded) redirect('/onboarding');
  }

  if ((session.user as any).isAdmin) {
    redirect('/admin');
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
          <div className="responsive-card-grid" style={{ gap: 'var(--space-xl)' }}>
            {allLists.map((list) => (
              <ListCard 
                key={list.id} 
                list={list as any} 
                href={list.id === 'favorites' ? `/profile/${session.user.username}` : `/lists/${list.id}`} 
              />
            ))}
          </div>
        )}
      </main>
    </SessionProvider>
  );
}
