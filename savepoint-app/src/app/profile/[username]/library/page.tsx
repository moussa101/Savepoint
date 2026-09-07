import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import { STATUS_LABELS, STATUS_COLORS, type GameStatus } from '@/lib/utils';
import { formatPlaytimeHours } from '@/lib/playtime';
import { GamepadIcon, LockIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';

export const metadata = { title: 'Library — Savepoint' };

const SHELVES: GameStatus[] = ['PLAYING', 'WANT_TO_PLAY', 'COMPLETED', 'DROPPED'];

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  });
  if (!user) return { title: 'Library Not Found' };
  return { title: `${user.name || user.username}'s Library — Savepoint` };
}

export default async function PublicLibraryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        libraryPublic: true,
        isPrivate: true,
      },
    }),
  ]);

  if (!user) notFound();

  const isOwn = session?.user?.id === user.id;
  const canView = isOwn || user.libraryPublic;

  if (!canView) {
    return (
      <SessionProvider>
        <Navbar />
        <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-3xl))' }}>
          <div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
            <LockIcon size={40} color="var(--text-muted)" />
            <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginTop: 'var(--space-md)' }}>
              Library is private
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
              @{user.username} hasn’t made their library public.
            </p>
            <Link href={`/profile/${user.username}`} className="btn btn-secondary" style={{ marginTop: 'var(--space-lg)' }}>
              Back to profile
            </Link>
          </div>
        </main>
      </SessionProvider>
    );
  }

  const userGames = await prisma.userGame.findMany({
    where: { userId: user.id },
    include: {
      game: {
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          avgPlaytimeMinutes: true,
          playtimeSampleCount: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  const byStatus = Object.fromEntries(
    SHELVES.map((status) => [status, userGames.filter((ug) => ug.status === status)])
  ) as Record<GameStatus, typeof userGames>;

  const totalHours = userGames.reduce((sum, ug) => sum + (ug.playtimeMinutes || 0), 0) / 60;

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
        <div className="container">
          <div className="page-header" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
              <UserAvatar
                className="avatar"
                style={{ width: 56, height: 56 }}
                src={user.image}
                name={user.name}
                username={user.username}
              />
              <div style={{ minWidth: 0 }}>
                <h1 className="page-title font-display" style={{ marginBottom: 4 }}>
                  {isOwn ? 'My Library' : `${user.name || user.username}'s Library`}
                </h1>
                <p className="page-subtitle">
                  <Link href={`/profile/${user.username}`} style={{ color: 'var(--accent-primary)' }}>
                    @{user.username}
                  </Link>
                  {' · '}
                  {userGames.length} games
                  {totalHours > 0 ? ` · ${totalHours.toFixed(0)} hours logged` : ''}
                </p>
              </div>
            </div>
            {isOwn && (
              <Link href="/library" className="btn btn-secondary btn-sm">
                Manage library
              </Link>
            )}
          </div>

          {userGames.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">
                <GamepadIcon size={48} color="var(--text-muted)" />
              </div>
              <div className="empty-state-title">No games yet</div>
              <div className="empty-state-text">
                {isOwn ? 'Add games from Discover or sync Steam.' : 'This library is empty.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
              {SHELVES.map((status) => {
                const items = byStatus[status];
                return (
                  <section key={status}>
                    <h2
                      className="font-display"
                      style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      <span className={`badge badge-${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {items.length}
                      </span>
                    </h2>

                    {items.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No games on this shelf.</p>
                    ) : (
                      <div className="scroll-row">
                        {items.map((ug) => {
                          const yours = formatPlaytimeHours(ug.playtimeMinutes);
                          const avg = formatPlaytimeHours(ug.game.avgPlaytimeMinutes);
                          return (
                            <Link key={ug.id} href={`/games/${ug.game.slug}`} className="landing-game-card">
                              <div className="game-cover">
                                {ug.game.coverImage ? (
                                  <img src={ug.game.coverImage} alt={ug.game.name} loading="lazy" decoding="async" />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
                                )}
                              </div>
                              <div className="landing-game-info">
                                <div className="landing-game-title">{ug.game.name}</div>
                                {ug.rating != null && ug.rating > 0 && <StarRating rating={ug.rating} size="sm" />}
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 6,
                                    flexWrap: 'wrap',
                                    marginTop: 4,
                                    fontSize: '0.65rem',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {yours && <span>{isOwn ? 'You' : 'Played'} {yours}</span>}
                                  {avg && ug.game.playtimeSampleCount > 0 && <span>Avg {avg}</span>}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ height: 'var(--space-3xl)' }} />
      </main>
    </SessionProvider>
  );
}
