import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import FollowButton from '@/components/ui/FollowButton';
import EditProfileWrapper from '@/components/profile/EditProfileWrapper';
import ReportButton from '@/components/ui/ReportButton';
import ProfileFriendActions from '@/components/ui/ProfileFriendActions';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';
import { GamepadIcon, CheckCircleIcon, StarIcon, EditIcon, LockIcon, ListIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { calculateLevel, getTierFromLevel, BADGE_DEFINITIONS } from '@/lib/gamification';
import ProfilePsnTrophies from '@/components/profile/ProfilePsnTrophies';
import ProfilePlatformTags from '@/components/profile/ProfilePlatformTags';
import { fetchSteamPersona } from '@/lib/steam';
import { Suspense, cache } from 'react';

const getUser = cache(async (username: string) => {
  // Everything is keyed by username (via relation filters) so the user row and
  // all of its library aggregates load in a single parallel round-trip.
  const [user, libraryByStatus, genreRows] = await Promise.all([
    prisma.user.findUnique({
    where: { username },
    include: {
      favoriteGames: {
        include: { game: true },
        orderBy: { order: 'asc' },
        take: 6,
      },
      reviews: {
        include: { game: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      lists: {
        where: { visibility: 'PUBLIC' },
        include: {
          items: {
            include: { game: { select: { coverImage: true } } },
            orderBy: { order: 'asc' },
            take: 4,
          },
          _count: { select: { items: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      },
      _count: {
        select: { followers: true, following: true, reviews: true, lists: true },
      },
      badges: {
        select: { badgeId: true }
      }
    },
    }),
    prisma.userGame.findMany({
      where: { user: { username } },
      include: { game: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.gameGenre.findMany({
      where: { game: { userGames: { some: { user: { username } } } } },
      select: { genre: true },
    }),
  ]);

  if (!user) return null;

  // Derived in memory from the full library instead of two extra queries.
  const userGamesStats = libraryByStatus.map(({ status, rating, gameId }) => ({ status, rating, gameId }));
  const currentlyPlaying = libraryByStatus.filter((ug) => ug.status === 'PLAYING').slice(0, 3);

  return {
    ...user,
    userGamesStats,
    libraryByStatus,
    currentlyPlaying,
    genreRows,
  };
});

function topCounts(items: string[], limit = 5) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Platforms the user actually imported from — not every storefront IGDB lists for a game. */
function platformLabelFromSource(source: string | null | undefined): string | null {
  switch ((source || '').toUpperCase()) {
    case 'STEAM':
      return 'Steam';
    case 'PSN':
      return 'PlayStation';
    case 'XBOX':
      return 'Xbox';
    case 'MANUAL':
      return 'Manual';
    default:
      return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) return { title: 'User Not Found' };
  return { title: `${user.name || user.username} — Savepoint` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [session, user] = await Promise.all([auth(), getUser(username)]);
  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  // Viewer-specific data: follow state (other people's profiles) or the full
  // list set including private lists (own profile). One round-trip either way.
  const [followRecord, ownListsResult, friendshipRelation] = await Promise.all([
    session?.user?.id && !isOwnProfile
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: user.id,
            },
          },
        })
      : Promise.resolve(null),
    isOwnProfile
      ? prisma.list.findMany({
          where: { userId: user.id },
          include: {
            items: {
              include: { game: { select: { coverImage: true } } },
              orderBy: { order: 'asc' },
              take: 4,
            },
            _count: { select: { items: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
        })
      : Promise.resolve(null),
    session?.user?.id && !isOwnProfile
      ? prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: session.user.id, addresseeId: user.id },
              { requesterId: user.id, addresseeId: session.user.id },
            ],
          },
        }).then(async (f) => {
          if (!f) return 'none' as const;
          if (f.status === 'ACCEPTED') return 'friends' as const;
          if (f.status === 'PENDING' && f.requesterId === session.user.id) return 'outgoing' as const;
          if (f.status === 'PENDING') return 'incoming' as const;
          return 'none' as const;
        })
      : Promise.resolve('none' as const),
  ]);
  const isFollowing = !!followRecord;

  // Private profiles hide reviews/lists/social; library visibility is separate (libraryPublic).
  const canViewPrivate = isOwnProfile || !user.isPrivate;
  const canViewLibrary = isOwnProfile || user.libraryPublic;

  if (!canViewPrivate && !canViewLibrary) {
    return (
      <SessionProvider>
        <Navbar />
        <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-3xl))' }}>
          <div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
            <LockIcon size={40} color="var(--text-muted)" />
            <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginTop: 'var(--space-md)' }}>
              @{user.username} is private
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              This profile and library are private.
            </p>
            {session?.user ? (
              <FollowButton targetUserId={user.id} isFollowing={isFollowing} isLoggedIn />
            ) : (
              <Link href="/login" className="btn btn-primary">Sign in</Link>
            )}
          </div>
        </main>
      </SessionProvider>
    );
  }

  if (!canViewPrivate) {
    // Profile private but library public — show a compact header + library CTA.
    return (
      <SessionProvider>
        <Navbar />
        <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-3xl))' }}>
          <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
            <UserAvatar
              className="avatar"
              style={{ width: 88, height: 88, margin: '0 auto', fontSize: '2rem' }}
              src={user.image}
              name={user.name}
              username={user.username}
            />
            <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginTop: 'var(--space-md)' }}>
              {user.name || user.username}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>@{user.username} · Private profile</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              Reviews and lists are hidden, but their library is public.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/profile/${user.username}/library`} className="btn btn-primary">
                View library
              </Link>
              {session?.user ? (
                <FollowButton targetUserId={user.id} isFollowing={isFollowing} isLoggedIn />
              ) : (
                <Link href="/login" className="btn btn-secondary">Sign in</Link>
              )}
            </div>
          </div>
        </main>
      </SessionProvider>
    );
  }

  const ownLists = ownListsResult ?? user.lists;

  let steamPersonaName: string | null = null;
  if (user.steamId) {
    try {
      const persona = await fetchSteamPersona(user.steamId);
      steamPersonaName = persona?.personaname || null;
    } catch {
      steamPersonaName = null;
    }
  }

  // Shared library with the signed-in viewer — only on a friend's profile (never your own).
  type SharedGameRow = {
    id: string;
    name: string;
    slug: string;
    coverImage: string | null;
    theirStatus: GameStatus;
    yourStatus: GameStatus;
  };
  let sharedGames: SharedGameRow[] = [];
  let sharedGamesTotal = 0;
  if (
    !isOwnProfile &&
    friendshipRelation === 'friends' &&
    canViewLibrary &&
    session?.user?.id
  ) {
    const viewerId = session.user.id;
    const [total, games] = await Promise.all([
      prisma.game.count({
        where: {
          AND: [
            { userGames: { some: { userId: viewerId } } },
            { userGames: { some: { userId: user.id } } },
          ],
        },
      }),
      prisma.game.findMany({
        where: {
          AND: [
            { userGames: { some: { userId: viewerId } } },
            { userGames: { some: { userId: user.id } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          userGames: {
            where: { userId: { in: [viewerId, user.id] } },
            select: { userId: true, status: true, updatedAt: true },
          },
        },
        orderBy: { name: 'asc' },
        take: 24,
      }),
    ]);
    sharedGamesTotal = total;
    sharedGames = games
      .map((g) => {
        const theirs = g.userGames.find((ug) => ug.userId === user.id);
        const yours = g.userGames.find((ug) => ug.userId === viewerId);
        if (!theirs || !yours) return null;
        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          coverImage: g.coverImage,
          theirStatus: theirs.status as GameStatus,
          yourStatus: yours.status as GameStatus,
        };
      })
      .filter((g): g is SharedGameRow => !!g)
      .sort((a, b) => {
        // Prefer games either of you is actively playing.
        const score = (s: GameStatus) =>
          s === 'PLAYING' ? 0 : s === 'COMPLETED' ? 1 : s === 'WANT_TO_PLAY' ? 2 : 3;
        return Math.min(score(a.theirStatus), score(a.yourStatus)) -
          Math.min(score(b.theirStatus), score(b.yourStatus));
      });
  }

  const gamesPlayed = user.userGamesStats.filter((g) => ['COMPLETED', 'PLAYING', 'DROPPED'].includes(g.status)).length;
  const gamesCompleted = user.userGamesStats.filter((g) => g.status === 'COMPLETED').length;
  const wantToPlay = user.libraryByStatus.filter((g) => g.status === 'WANT_TO_PLAY');
  const playing = user.libraryByStatus.filter((g) => g.status === 'PLAYING');
  const completed = user.libraryByStatus.filter((g) => g.status === 'COMPLETED');
  const dropped = user.libraryByStatus.filter((g) => g.status === 'DROPPED');
  const ratingsGiven = user.userGamesStats.filter((g) => g.rating);
  const avgRating = ratingsGiven.length > 0
    ? ratingsGiven.reduce((sum, g) => sum + (g.rating || 0), 0) / ratingsGiven.length
    : 0;
  const topGenres = topCounts(user.genreRows.map((g) => g.genre));
  const topPlatforms = topCounts(
    user.libraryByStatus
      .map((ug) => platformLabelFromSource(ug.source))
      .filter((p): p is string => !!p)
  );
  const favoriteDevelopers = topCounts(
    user.libraryByStatus.map((ug) => ug.game.developer).filter((d): d is string => !!d)
  );

  const shelves: { key: GameStatus; title: string; items: typeof wantToPlay }[] = [
    { key: 'PLAYING', title: 'Currently Playing', items: playing },
    { key: 'WANT_TO_PLAY', title: 'Want to Play', items: wantToPlay },
    { key: 'COMPLETED', title: 'Completed', items: completed },
    { key: 'DROPPED', title: 'Dropped', items: dropped },
  ];

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content">
        <div style={{
          height: '280px',
          marginTop: 0,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)'
        }}>
          {user.bannerImage ? (
            <img src={user.bannerImage} alt="Profile Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, rgba(0, 229, 160, 0.15) 100%)' }} />
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(13, 13, 26, 0.2) 0%, var(--bg-background) 100%)',
            pointerEvents: 'none'
          }} />
        </div>

        <div className="container" style={{ marginTop: '-100px', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'rgba(26, 26, 46, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-xl)',
            display: 'flex',
            gap: 'var(--space-xl)',
            alignItems: 'center',
            marginBottom: 'var(--space-2xl)',
            flexWrap: 'wrap',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            <UserAvatar
              className="avatar avatar-ring"
              style={{ width: '120px', height: '120px', fontSize: '3rem' }}
              src={user.image}
              name={user.name}
              username={user.username}
            />
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <h1 className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {user.name || user.username}
                  <VerifiedBadge isOfficial={user.isOfficial} username={user.username} size={22} />
                </h1>
                {user.isPrivate && <span className="badge"><LockIcon size={12} /> Private</span>}
                {user.equippedBadge && (
                  <span className="badge" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-background)' }}>
                    {BADGE_DEFINITIONS.find(b => b.id === user.equippedBadge)?.name || user.equippedBadge}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <p style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  @{user.username}
                  <VerifiedBadge isOfficial={user.isOfficial} username={user.username} size={14} />
                </p>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Level {calculateLevel(user.xp)} · {getTierFromLevel(calculateLevel(user.xp))} · {user.xp} XP
                </span>
              </div>
              {user.bio && <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', maxWidth: '600px' }}>{user.bio}</p>}
              <ProfilePlatformTags
                steamId={user.steamId}
                steamPersonaName={steamPersonaName}
                xboxGamertag={user.xboxGamertag}
                psnOnlineId={user.psnOnlineId}
              />
              <div style={{ display: 'flex', gap: 'var(--space-xl)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{gamesPlayed}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Games</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user.favoriteGames.length}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Favorites</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user._count.reviews}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Reviews</span>
                </span>
                <Link href={`/profile/${user.username}/following`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user._count.following}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Following</span>
                </Link>
                <Link href={`/profile/${user.username}/followers`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user._count.followers}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Followers</span>
                </Link>
              </div>
            </div>
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              {!isOwnProfile && (
                <>
                  <FollowButton targetUserId={user.id} isFollowing={isFollowing} isLoggedIn={!!session?.user} />
                  {session?.user && (
                    <ProfileFriendActions targetUserId={user.id} relation={friendshipRelation} />
                  )}
                  {session?.user && <ReportButton targetType="PROFILE" targetId={user.id} reportedUserId={user.id} />}
                </>
              )}
              {isOwnProfile && (
                <EditProfileWrapper user={{ name: user.name, bio: user.bio, image: user.image, bannerImage: user.bannerImage }} />
              )}
            </div>
          </div>

          {canViewLibrary && user.currentlyPlaying.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Currently Playing:</span>
              {user.currentlyPlaying.map((ug) => (
                <Link key={ug.id} href={`/games/${ug.game.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', textDecoration: 'none', color: 'inherit' }}>
                  <div className="game-cover" style={{ width: '32px', height: '43px' }}>
                    {ug.game.coverImage && <img src={ug.game.coverImage} alt={ug.game.name} loading="lazy" decoding="async" />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{ug.game.name}</span>
                </Link>
              ))}
            </div>
          )}

          {user.favoriteGames.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Favorite Games</h2>
              <div className="scroll-row">
                {user.favoriteGames.map((fg) => (
                  <Link key={fg.id} href={`/games/${fg.game.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="game-cover" style={{ width: '140px', height: '187px' }}>
                      {fg.game.coverImage && <img src={fg.game.coverImage} alt={fg.game.name} loading="lazy" decoding="async" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-3xl)' }}>
            {[
              { label: 'Games Played', value: gamesPlayed, icon: <GamepadIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Completed', value: gamesCompleted, icon: <CheckCircleIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: <StarIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Reviews', value: user._count.reviews, icon: <EditIcon size={24} color="var(--accent-primary)" /> },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>{stat.icon}</div>
                <div className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 900 }}>{stat.value}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {(topGenres.length > 0 || topPlatforms.length > 0 || favoriteDevelopers.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-3xl)' }}>
              {topGenres.length > 0 && (
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>Top Genres</h3>
                  {topGenres.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
                      <span>{name}</span><span style={{ color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {topPlatforms.length > 0 && (
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>Top Platforms</h3>
                  {topPlatforms.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
                      <span>{name}</span><span style={{ color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {favoriteDevelopers.length > 0 && (
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>Favorite Developers</h3>
                  {favoriteDevelopers.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
                      <span>{name}</span><span style={{ color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sharedGames.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 'var(--space-sm)',
                  flexWrap: 'wrap',
                  marginBottom: 'var(--space-md)',
                }}
              >
                <h2 className="section-title font-display" style={{ margin: 0 }}>
                  Games in common{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>
                    ({sharedGamesTotal})
                  </span>
                </h2>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  In both your libraries
                </p>
              </div>
              <div className="scroll-row">
                {sharedGames.map((g) => (
                  <Link
                    key={g.id}
                    href={`/games/${g.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit', width: 120 }}
                  >
                    <div
                      className="game-cover"
                      style={{ width: '120px', height: '160px', marginBottom: 8, position: 'relative' }}
                    >
                      {g.coverImage && (
                        <img
                          src={g.coverImage}
                          alt={g.name}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <span
                        className={`badge badge-${STATUS_COLORS[g.theirStatus]}`}
                        style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.6rem' }}
                      >
                        {STATUS_LABELS[g.theirStatus]}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {g.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      You: {STATUS_LABELS[g.yourStatus]}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {canViewLibrary ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <h2 className="section-title font-display" style={{ margin: 0 }}>Library</h2>
                <Link href={`/profile/${user.username}/library`} className="btn btn-secondary btn-sm">
                  View full library
                </Link>
              </div>
              {shelves.map((shelf) => (
                shelf.items.length > 0 ? (
                  <div key={shelf.key} style={{ marginBottom: 'var(--space-2xl)' }}>
                    <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>
                      {shelf.title} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>({shelf.items.length})</span>
                    </h2>
                    <div className="scroll-row">
                      {shelf.items.slice(0, 12).map((ug) => (
                        <Link key={ug.id} href={`/games/${ug.game.slug}`} style={{ textDecoration: 'none', color: 'inherit', width: 120 }}>
                          <div className="game-cover" style={{ width: '120px', height: '160px', marginBottom: 8, position: 'relative' }}>
                            {ug.game.coverImage && <img src={ug.game.coverImage} alt={ug.game.name} loading="lazy" decoding="async" />}
                            <span className={`badge badge-${STATUS_COLORS[ug.status as GameStatus]}`} style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.6rem' }}>
                              {STATUS_LABELS[ug.status as GameStatus]}
                            </span>
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ug.game.name}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null
              ))}
            </>
          ) : (
            <div className="card" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
              <LockIcon size={24} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>This user’s library is private.</p>
            </div>
          )}

          {ownLists.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <ListIcon size={22} /> Lists
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
                {ownLists.map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-md)' }}>
                      {list.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="game-cover" style={{ width: 48, height: 64, flex: 1 }}>
                          {item.game.coverImage && <img src={item.game.coverImage} alt="" loading="lazy" decoding="async" />}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontWeight: 700 }}>{list.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      {list._count.items} games{isOwnProfile && list.visibility === 'PRIVATE' ? ' · Private' : ''}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {user.badges.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Trophy Cabinet</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                {user.badges.map((userBadge) => {
                  const badgeDef = BADGE_DEFINITIONS.find(b => b.id === userBadge.badgeId);
                  if (!badgeDef) return null;
                  return (
                    <div key={userBadge.badgeId} className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                      <StarIcon size={24} color="var(--accent-primary)" />
                      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginTop: 'var(--space-md)' }}>{badgeDef.name}</h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{badgeDef.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Suspense fallback={null}>
            <ProfilePsnTrophies userId={user.id} isOwnProfile={isOwnProfile} />
          </Suspense>

          {user.reviews.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Recent Reviews</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {user.reviews.map((review) => (
                  <div key={review.id} className="card">
                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                      <Link href={`/games/${review.game.slug}`}>
                        <div className="game-cover" style={{ width: '60px', height: '80px', flexShrink: 0 }}>
                          {review.game.coverImage && <img src={review.game.coverImage} alt={review.game.name} loading="lazy" decoding="async" />}
                        </div>
                      </Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/games/${review.game.slug}`} style={{ fontWeight: 700 }}>{review.game.name}</Link>
                        <div style={{ marginTop: '4px', marginBottom: 'var(--space-sm)' }}>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                          {review.text.length > 200 ? review.text.slice(0, 200) + '...' : review.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 'var(--space-3xl)' }} />
      </main>
    </SessionProvider>
  );
}
