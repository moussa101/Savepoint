import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import StarRating from '@/components/ui/StarRating';
import { formatRelativeTime, STATUS_LABELS } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';
import { SignalIcon, HeartIcon } from '@/components/ui/Icons';
import ActivityActionBar from '@/components/feed/ActivityActionBar';
import { getTrendingGamesCached } from '@/lib/cached-queries';
import UserAvatar from '@/components/ui/UserAvatar';

export const metadata = { title: 'Feed — Savepoint' };

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if ((session.user as { onboarded?: boolean }).onboarded === false) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.onboarded) {
      redirect('/onboarding');
    }
  }

  if ((session.user as { isAdmin?: boolean }).isAdmin) {
    redirect('/admin');
  }

  const userId = session.user.id;

  // One database round for the whole page: the "who do I follow" lookup is
  // folded into the activity query as a relation filter, and trending games
  // come from the shared cache.
  const [activities, trending] = await Promise.all([
    prisma.activity.findMany({
    where: {
      // Own activity, or activity from anyone this user follows.
      user: {
        OR: [{ id: userId }, { followers: { some: { followerId: userId } } }],
      },
      OR: [
        { type: { not: 'LIST' } },
        { list: { visibility: 'PUBLIC' } },
        { userId: session.user.id, type: 'LIST' },
      ],
    },
    include: {
      user: { select: { username: true, name: true, image: true } },
      review: { include: { game: { select: { id: true, name: true, slug: true, coverImage: true } } } },
      userGame: { include: { game: { select: { id: true, name: true, slug: true, coverImage: true } } } },
      list: {
        include: {
          items: {
            include: { game: { select: { id: true, name: true, slug: true, coverImage: true } } },
            take: 4,
          },
        },
      },
      favorite: { include: { game: { select: { id: true, name: true, slug: true, coverImage: true } } } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: session.user.id } },
      comments: {
        include: { user: { select: { id: true, username: true, name: true, image: true } } },
        orderBy: { createdAt: 'asc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    }),
    getTrendingGamesCached(),
  ]);

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <h1 className="page-title font-display">Your Feed</h1>

        <div className="feed-layout">
          {/* Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {activities.length === 0 ? (
              <div className="empty-state card">
                <div className="empty-state-icon"><SignalIcon size={48} color="var(--text-muted)" /></div>
                <div className="empty-state-title">Your feed is empty</div>
                <div className="empty-state-text">Follow other gamers or start tracking games to see activity here.</div>
                <Link href="/games" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Browse Games</Link>
              </div>
            ) : (
              activities.map((item, i) => {
                const user = item.user;
                const likesCount = item._count.likes;
                const hasLiked = item.likes.length > 0;
                const activityComments = item.comments.map((c) => ({
                  ...c,
                  userId: c.userId,
                }));

                const actionBar = (
                  <ActivityActionBar
                    activityId={item.id}
                    initialLikes={likesCount}
                    initialHasLiked={hasLiked}
                    comments={activityComments}
                    isLoggedIn={true}
                    currentUserId={session.user.id}
                  />
                );

                if (item.type === 'REVIEW' && item.review) {
                  const d = item.review;
                  const game = d.game;
                  return (
                    <div key={`review-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Link href={`/profile/${user.username}`}>
                          <UserAvatar
                            className="avatar"
                            src={user.image}
                            name={user.name}
                            username={user.username}
                          />
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
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>
                        {game?.coverImage && (
                          <Link href={`/games/${game.slug}`}>
                            <div className="game-cover" style={{ width: '50px', height: '67px', flexShrink: 0 }}>
                              <img src={game.coverImage} alt="" loading="lazy" decoding="async" />
                            </div>
                          </Link>
                        )}
                      </div>
                      {actionBar}
                    </div>
                  );
                }

                if (item.type === 'TRACKING' && item.userGame) {
                  const d = item.userGame;
                  const game = d.game;
                  const status = d.status as string;
                  return (
                    <div key={`tracking-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        <Link href={`/profile/${user.username}`}>
                          <UserAvatar
                            className="avatar"
                            src={user.image}
                            name={user.name}
                            username={user.username}
                          />
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
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>
                        {game?.coverImage && (
                          <Link href={`/games/${game.slug}`}>
                            <div className="game-cover" style={{ width: '50px', height: '67px', flexShrink: 0 }}>
                              <img src={game.coverImage} alt="" loading="lazy" decoding="async" />
                            </div>
                          </Link>
                        )}
                      </div>
                      {actionBar}
                    </div>
                  );
                }

                if (item.type === 'LIST' && item.list) {
                  const d = item.list;
                  const items = d.items || [];
                  return (
                    <div key={`list-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Link href={`/profile/${user.username}`}>
                          <UserAvatar
                            className="avatar"
                            src={user.image}
                            name={user.name}
                            username={user.username}
                          />
                        </Link>
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${user.username}`} style={{ fontWeight: 700 }}>
                            {user.name || user.username}
                          </Link>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>created a list:</span>{' '}
                          <Link href={`/lists/${d.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                            <strong>&ldquo;{String(d.title)}&rdquo;</strong>
                          </Link>
                          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            {items.slice(0, 4).map((item, j) => (
                              <Link key={j} href={`/games/${item.game.slug}`}>
                                <div className="game-cover" style={{ width: '60px', height: '80px' }}>
                                  {item.game.coverImage && <img src={item.game.coverImage} alt="" loading="lazy" decoding="async" />}
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                      {actionBar}
                    </div>
                  );
                }

                if (item.type === 'FAVORITE' && item.favorite) {
                  const d = item.favorite;
                  const game = d.game;
                  return (
                    <div key={`favorite-${i}`} className="card animate-fade-in">
                      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        <Link href={`/profile/${user.username}`}>
                          <UserAvatar
                            className="avatar"
                            src={user.image}
                            name={user.name}
                            username={user.username}
                          />
                        </Link>
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${user.username}`} style={{ fontWeight: 700 }}>
                            {user.name || user.username}
                          </Link>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>favorited</span>{' '}
                          <Link href={`/games/${game?.slug}`} style={{ fontWeight: 700 }}>
                            {game?.name}
                          </Link>
                          <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 'var(--space-sm)' }}>
                            <HeartIcon size={16} filled color="var(--accent-primary)" />
                          </span>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>
                        {game?.coverImage && (
                          <Link href={`/games/${game.slug}`}>
                            <div className="game-cover" style={{ width: '50px', height: '67px', flexShrink: 0 }}>
                              <img src={game.coverImage} alt="" loading="lazy" decoding="async" />
                            </div>
                          </Link>
                        )}
                      </div>
                      {actionBar}
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="feed-side">
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                Trending Games
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {trending.map((game) => (
                  <Link key={game.id} href={`/games/${game.slug}`} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <div className="game-cover" style={{ width: '40px', height: '53px', flexShrink: 0 }}>
                      {game.coverImage && <img src={game.coverImage} alt="" loading="lazy" decoding="async" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{game.name}</div>
                      <StarRating rating={game.avgRating} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
