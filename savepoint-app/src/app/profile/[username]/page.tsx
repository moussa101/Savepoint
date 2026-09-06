import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import FollowButton from './FollowButton';
import EditProfileWrapper from '@/components/profile/EditProfileWrapper';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { title: 'User Not Found' };
  return { title: `${user.name || user.username} — Savepoint` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      userGames: {
        include: { game: { include: { genres: true } } },
        orderBy: { updatedAt: 'desc' },
      },
      reviews: {
        include: { game: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      lists: {
        where: { visibility: 'PUBLIC' },
        include: { items: { include: { game: true }, take: 4 } },
        orderBy: { updatedAt: 'desc' },
        take: 4,
      },
      favoriteGames: {
        include: { game: true },
        orderBy: { order: 'asc' },
        take: 6,
      },
      _count: {
        select: { followers: true, following: true, reviews: true, lists: true },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;
  let isFollowing = false;
  if (session?.user?.id && !isOwnProfile) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: session.user.id, followingId: user.id },
      },
    });
    isFollowing = !!follow;
  }

  // Stats
  const gamesPlayed = user.userGames.length;
  const gamesCompleted = user.userGames.filter((g) => g.status === 'COMPLETED').length;
  const ratingsGiven = user.userGames.filter((g) => g.rating).length;
  const avgRating = ratingsGiven > 0
    ? user.userGames.reduce((sum, g) => sum + (g.rating || 0), 0) / ratingsGiven
    : 0;
  const currentlyPlaying = user.userGames.filter((g) => g.status === 'PLAYING');

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content">
        {/* Banner */}
        <div style={{
          height: '200px',
          background: user.bannerImage
            ? `url(${user.bannerImage}) center/cover`
            : 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, rgba(0, 229, 160, 0.1) 100%)',
          marginTop: 'var(--navbar-height)',
        }} />

        <div className="container" style={{ marginTop: '-60px', position: 'relative', zIndex: 2 }}>
          {/* Profile header */}
          <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'flex-end', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
            <div className="avatar avatar-2xl avatar-ring">
              {user.image ? (
                <img src={user.image} alt={user.name || user.username} />
              ) : (
                (user.name || user.username).charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>
                {user.name || user.username}
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                @{user.username}
              </p>
              {user.bio && <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{user.bio}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-xl)', fontSize: 'var(--text-sm)' }}>
                <span><strong>{gamesPlayed}</strong> <span style={{ color: 'var(--text-muted)' }}>Games</span></span>
                <span><strong>{user.favoriteGames.length}</strong> <span style={{ color: 'var(--text-muted)' }}>Favorites</span></span>
                <span><strong>{user._count.reviews}</strong> <span style={{ color: 'var(--text-muted)' }}>Reviews</span></span>
                <span><strong>{user._count.following}</strong> <span style={{ color: 'var(--text-muted)' }}>Following</span></span>
                <span><strong>{user._count.followers}</strong> <span style={{ color: 'var(--text-muted)' }}>Followers</span></span>
              </div>
            </div>
            {!isOwnProfile && session ? (
              <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
            ) : isOwnProfile ? (
              <EditProfileWrapper user={{ name: user.name, bio: user.bio, image: user.image, bannerImage: user.bannerImage }} />
            ) : null}
          </div>

          {/* Currently Playing */}
          {currentlyPlaying.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Currently Playing:</span>
              {currentlyPlaying.slice(0, 3).map((ug) => (
                <Link key={ug.id} href={`/games/${ug.game.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', textDecoration: 'none', color: 'inherit' }}>
                  <div className="game-cover" style={{ width: '32px', height: '43px' }}>
                    {ug.game.coverImage && <img src={ug.game.coverImage} alt={ug.game.name} />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{ug.game.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Favorite Games */}
          {user.favoriteGames.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Favorite Games</h2>
              <div className="scroll-row">
                {user.favoriteGames.map((fg) => (
                  <Link key={fg.id} href={`/games/${fg.game.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="game-cover" style={{ width: '140px', height: '187px' }}>
                      {fg.game.coverImage && <img src={fg.game.coverImage} alt={fg.game.name} />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stats Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
            {[
              { label: 'Games Played', value: gamesPlayed, icon: '🎮' },
              { label: 'Completed', value: gamesCompleted, icon: '✅' },
              { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: '⭐' },
              { label: 'Reviews', value: user._count.reviews, icon: '📝' },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>{stat.icon}</div>
                <div className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{stat.value}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Library */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Library</h2>
            {user.userGames.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-title">No games in library</div>
              </div>
            ) : (
              <div className="game-grid">
                {user.userGames.slice(0, 12).map((ug) => (
                  <Link key={ug.id} href={`/games/${ug.game.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="game-cover" style={{ marginBottom: 'var(--space-sm)', position: 'relative' }}>
                      {ug.game.coverImage && <img src={ug.game.coverImage} alt={ug.game.name} />}
                      <span
                        className={`badge badge-${STATUS_COLORS[ug.status as GameStatus]}`}
                        style={{ position: 'absolute', bottom: '8px', left: '8px' }}
                      >
                        {STATUS_LABELS[ug.status as GameStatus]}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ug.game.name}
                    </div>
                    {ug.rating && <StarRating rating={ug.rating} size="sm" />}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reviews */}
          {user.reviews.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Recent Reviews</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {user.reviews.map((review) => (
                  <div key={review.id} className="card">
                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                      <Link href={`/games/${review.game.slug}`}>
                        <div className="game-cover" style={{ width: '60px', height: '80px', flexShrink: 0 }}>
                          {review.game.coverImage && <img src={review.game.coverImage} alt={review.game.name} />}
                        </div>
                      </Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/games/${review.game.slug}`} style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>
                          {review.game.name}
                        </Link>
                        <div style={{ marginTop: '4px', marginBottom: 'var(--space-sm)' }}>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
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
