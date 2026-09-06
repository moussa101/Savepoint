import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import { formatRelativeTime, STATUS_LABELS } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';

export const metadata = { title: 'Feed — Savepoint' };

export default async function FeedPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Get users the current user follows
  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  const feedUserIds = [...followingIds, session.user.id];

  // Get recent activity from followed users (and self)
  const recentReviews = await prisma.review.findMany({
    where: { userId: { in: feedUserIds } },
    include: {
      user: { select: { username: true, name: true, image: true } },
      game: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentTracking = await prisma.userGame.findMany({
    where: { userId: { in: feedUserIds } },
    include: {
      user: { select: { username: true, name: true, image: true } },
      game: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const recentLists = await prisma.list.findMany({
    where: { userId: { in: feedUserIds }, visibility: 'PUBLIC' },
    include: {
      user: { select: { username: true, name: true, image: true } },
      items: { include: { game: true }, take: 4 },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Merge and sort by date
  type FeedItem = {
    type: 'review' | 'tracking' | 'list';
    date: Date;
    data: Record<string, unknown>;
  };

  const feedItems: FeedItem[] = [
    ...recentReviews.map((r) => ({
      type: 'review' as const,
      date: r.createdAt,
      data: r as unknown as Record<string, unknown>,
    })),
    ...recentTracking.map((t) => ({
      type: 'tracking' as const,
      date: t.updatedAt,
      data: t as unknown as Record<string, unknown>,
    })),
    ...recentLists.map((l) => ({
      type: 'list' as const,
      date: l.createdAt,
      data: l as unknown as Record<string, unknown>,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

  // Trending games
  const trending = await prisma.game.findMany({
    orderBy: { ratingCount: 'desc' },
    take: 5,
    include: { genres: true },
  });

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <h1 className="page-title font-display">Your Feed</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>
          {/* Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {feedItems.length === 0 ? (
              <div className="empty-state card">
                <div className="empty-state-icon">📡</div>
                <div className="empty-state-title">Your feed is empty</div>
                <div className="empty-state-text">Follow other gamers or start tracking games to see activity here.</div>
                <Link href="/games" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Browse Games</Link>
              </div>
            ) : (
              feedItems.map((item, i) => {
                const d = item.data as Record<string, unknown>;
                const user = d.user as { username: string; name: string | null; image: string | null };
                const game = d.game as { slug: string; name: string; coverImage: string | null } | undefined;

                if (item.type === 'review') {
                  return (
                    <div key={`review-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Link href={`/profile/${user.username}`}>
                          <div className="avatar">
                            {user.image ? <img src={user.image} alt="" /> : (user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: 'var(--space-sm)' }}>
                            <Link href={`/profile/${user.username}`} style={{ fontWeight: 700 }}>
                              {user.name || user.username}
                            </Link>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>reviewed</span>{' '}
                            <Link href={`/games/${game?.slug}`} style={{ fontWeight: 700 }}>
                              {game?.name}
                            </Link>
                            <StarRating rating={(d.rating as number) || 0} size="sm" />
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            {String(d.text || '').slice(0, 200)}...
                          </p>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                            {formatRelativeTime(item.date)}
                          </div>
                        </div>
                        {game?.coverImage && (
                          <Link href={`/games/${game.slug}`}>
                            <div className="game-cover" style={{ width: '50px', height: '67px', flexShrink: 0 }}>
                              <img src={game.coverImage} alt="" />
                            </div>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.type === 'tracking') {
                  const status = d.status as string;
                  return (
                    <div key={`tracking-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        <Link href={`/profile/${user.username}`}>
                          <div className="avatar">
                            {user.image ? <img src={user.image} alt="" /> : (user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${user.username}`} style={{ fontWeight: 700 }}>
                            {user.name || user.username}
                          </Link>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {status === 'COMPLETED' ? 'completed' : status === 'PLAYING' ? 'started playing' : 'added'}
                          </span>{' '}
                          <Link href={`/games/${game?.slug}`} style={{ fontWeight: 700 }}>
                            {game?.name}
                          </Link>
                          <span className={`badge badge-${status?.toLowerCase().replace('_', '-')}`} style={{ marginLeft: 'var(--space-sm)' }}>
                            {STATUS_LABELS[status as GameStatus] || status}
                          </span>
                          {Boolean(d.rating) && (
                            <div style={{ marginTop: '4px' }}>
                              <StarRating rating={d.rating as number} size="sm" />
                            </div>
                          )}
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                            {formatRelativeTime(item.date)}
                          </div>
                        </div>
                        {game?.coverImage && (
                          <Link href={`/games/${game.slug}`}>
                            <div className="game-cover" style={{ width: '50px', height: '67px', flexShrink: 0 }}>
                              <img src={game.coverImage} alt="" />
                            </div>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.type === 'list') {
                  const items = (d.items as Array<{ game: { slug: string; name: string; coverImage: string | null } }>) || [];
                  return (
                    <div key={`list-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Link href={`/profile/${user.username}`}>
                          <div className="avatar">
                            {user.image ? <img src={user.image} alt="" /> : (user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${user.username}`} style={{ fontWeight: 700 }}>
                            {user.name || user.username}
                          </Link>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>created a list:</span>{' '}
                          <strong>&ldquo;{String(d.title)}&rdquo;</strong>
                          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            {items.slice(0, 4).map((item, j) => (
                              <Link key={j} href={`/games/${item.game.slug}`}>
                                <div className="game-cover" style={{ width: '60px', height: '80px' }}>
                                  {item.game.coverImage && <img src={item.game.coverImage} alt="" />}
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                            {formatRelativeTime(item.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>

          {/* Right Sidebar */}
          <div>
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                Trending Games
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {trending.map((game) => (
                  <Link key={game.id} href={`/games/${game.slug}`} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <div className="game-cover" style={{ width: '40px', height: '53px', flexShrink: 0 }}>
                      {game.coverImage && <img src={game.coverImage} alt="" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{game.name}</div>
                      <StarRating rating={game.avgRating} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </SessionProvider>
  );
}
