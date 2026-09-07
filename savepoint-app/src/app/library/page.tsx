import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import { STATUS_LABELS, STATUS_COLORS, type GameStatus } from '@/lib/utils';
import { GamepadIcon, SteamIcon } from '@/components/ui/Icons';
import SteamSyncButton from './SteamSyncButton';

export const metadata = { title: 'My Library — Savepoint' };
// Steam sync is a server action invoked from this route; allow time for big libraries.
export const maxDuration = 60;

const SHELVES: GameStatus[] = ['PLAYING', 'WANT_TO_PLAY', 'COMPLETED', 'DROPPED'];

function formatHours(minutes: number | null | undefined) {
  const m = minutes || 0;
  if (m <= 0) return null;
  const hours = m / 60;
  if (hours < 1) return `${m}m`;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ steam?: string }>;
}) {
  const [{ steam: steamQuery }, session] = await Promise.all([searchParams, auth()]);
  if (!session) redirect('/login');
  if ((session.user as { onboarded?: boolean }).onboarded === false) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.onboarded) redirect('/onboarding');
  }
  if ((session.user as { isAdmin?: boolean }).isAdmin) {
    redirect('/admin');
  }

  const [userGames, steamLink] = await Promise.all([
    prisma.userGame.findMany({
      where: { userId: session.user.id },
      include: {
        game: { select: { id: true, name: true, slug: true, coverImage: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { steamId: true, steamLastSyncAt: true },
    }),
  ]);
  const steamLinked = !!steamLink?.steamId;

  const byStatus = Object.fromEntries(
    SHELVES.map((status) => [status, userGames.filter((ug) => ug.status === status)])
  ) as Record<GameStatus, typeof userGames>;

  const totalHours = userGames.reduce((sum, ug) => sum + (ug.playtimeMinutes || 0), 0) / 60;

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">My Library</h1>
            <p className="page-subtitle">
              {userGames.length} games
              {totalHours > 0 ? ` · ${totalHours.toFixed(0)} hours logged` : ''}
            </p>
          </div>
          <Link href="/games" className="btn btn-secondary">
            Browse games
          </Link>
        </div>

        {/* Steam */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
            <SteamIcon size={28} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>Steam library</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {steamQuery === 'linked'
                  ? 'Steam connected. Sync to import games and playtime.'
                  : steamQuery === 'taken'
                    ? 'That Steam account is already linked to another Savepoint user.'
                    : steamQuery === 'invalid' || steamQuery === 'error'
                      ? 'Steam connection failed. Try again.'
                      : steamLinked
                        ? steamLink?.steamLastSyncAt
                          ? `Last synced ${new Date(steamLink.steamLastSyncAt).toLocaleString()}`
                          : 'Connected — run your first sync to import your games and playtime.'
                        : 'Link Steam to this Savepoint account (works alongside Google, Discord, or Xbox).'}
              </div>
            </div>
          </div>
          {steamLinked ? (
            <SteamSyncButton />
          ) : (
            <a href="/api/auth/steam?mode=link&return=library" className="btn btn-primary btn-sm">
              Connect Steam
            </a>
          )}
        </div>

        {userGames.length === 0 && (
          <div className="empty-state card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="empty-state-icon">
              <GamepadIcon size={48} color="var(--text-muted)" />
            </div>
            <div className="empty-state-title">Your library is empty</div>
            <div className="empty-state-text">
              {steamLinked
                ? 'Hit “Sync now” above to import your Steam library, or add games from Discover.'
                : 'Connect Steam above to import your games, or add them from Discover.'}
            </div>
            <Link href="/games" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
              Discover games
            </Link>
          </div>
        )}

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
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No games on this shelf yet.</p>
                ) : (
                  <div className="scroll-row">
                    {items.map((ug) => {
                      const hours = formatHours(ug.playtimeMinutes);
                      return (
                        <Link
                          key={ug.id}
                          href={`/games/${ug.game.slug}`}
                          className="landing-game-card"
                        >
                          <div className="game-cover">
                            {ug.game.coverImage ? (
                              <img src={ug.game.coverImage} alt={ug.game.name} loading="lazy" decoding="async" />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
                            )}
                          </div>
                          <div className="landing-game-info">
                            <div className="landing-game-title">{ug.game.name}</div>
                            {ug.rating != null && ug.rating > 0 && (
                              <StarRating rating={ug.rating} size="sm" />
                            )}
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
                              {hours && <span>{hours}</span>}
                              {ug.source === 'STEAM' && <span className="pill">Steam</span>}
                              {ug.source === 'XBOX' && <span className="pill">Xbox</span>}
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
      </main>
    </SessionProvider>
  );
}
