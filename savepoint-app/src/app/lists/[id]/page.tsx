import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import ListGameManager from './ListGameManager';

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, name: true, image: true } },
      items: {
        include: { game: { include: { genres: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!list) notFound();
  if (list.visibility === 'PRIVATE' && list.userId !== session?.user?.id) notFound();

  const isOwner = list.userId === session?.user?.id;

  // Get all games for add-to-list
  const allGames = isOwner
    ? await prisma.game.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    : [];

  const existingGameIds = list.items.map((item) => item.gameId);

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ padding: 'var(--space-xl)', paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <Link href="/lists" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              ← Back to Lists
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
            <div>
              <h1 className="page-title font-display">{list.title}</h1>
              {list.description && <p className="page-subtitle">{list.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <Link href={`/profile/${list.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div className="avatar avatar-sm">
                    {list.user.image ? <img src={list.user.image} alt="" /> : (list.user.name || list.user.username).charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{list.user.name || list.user.username}</span>
                </Link>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>• {list.items.length} games</span>
                <span className={`badge ${list.visibility === 'PUBLIC' ? 'badge-accent' : ''}`}>
                  {list.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                </span>
              </div>
            </div>
          </div>

          {/* Games in list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {list.items.map((item, index) => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-muted)', width: '30px', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                  {index + 1}
                </div>
                <Link href={`/games/${item.game.slug}`}>
                  <div className="game-cover" style={{ width: '60px', height: '80px', flexShrink: 0 }}>
                    {item.game.coverImage && <img src={item.game.coverImage} alt={item.game.name} />}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <Link href={`/games/${item.game.slug}`} style={{ fontWeight: 700 }}>
                    {item.game.name}
                  </Link>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    {item.game.genres.slice(0, 3).map((g) => (
                      <span key={g.id} className="pill" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                        {g.genre}
                      </span>
                    ))}
                  </div>
                  {item.game.avgRating > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <StarRating rating={item.game.avgRating} size="sm" showValue />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add game (owner only) */}
          {isOwner && (
            <ListGameManager
              listId={list.id}
              games={allGames.filter((g) => !existingGameIds.includes(g.id))}
            />
          )}
        </div>
      </main>
    </SessionProvider>
  );
}
