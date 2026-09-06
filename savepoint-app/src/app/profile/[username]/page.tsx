import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import FollowButton from '@/components/ui/FollowButton';
import EditProfileWrapper from '@/components/profile/EditProfileWrapper';
import { STATUS_LABELS, STATUS_COLORS, formatRelativeTime } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';
import { GamepadIcon, CheckCircleIcon, StarIcon, EditIcon } from '@/components/ui/Icons';

import { cache } from 'react';

const getUser = cache(async (username: string) => {
  return await prisma.user.findUnique({
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
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) return { title: 'User Not Found' };
  return { title: `${user.name || user.username} — Savepoint` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  const user = await getUser(username);

  if (!user) notFound();

  // Check if current user is following this profile
  let isFollowing = false;
  if (session?.user?.id && session.user.id !== user.id) {
    const followRecord = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: user.id,
        }
      }
    });
    isFollowing = !!followRecord;
  }

  const isOwnProfile = session?.user?.username === user.username;
  const gamesPlayed = user.userGames.filter((g) => ['COMPLETED', 'PLAYING', 'DROPPED'].includes(g.status)).length;
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
          height: '280px',
          marginTop: 'var(--navbar-height)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)'
        }}>
          {user.bannerImage ? (
            <img 
              src={user.bannerImage} 
              alt="Profile Banner" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, rgba(0, 229, 160, 0.15) 100%)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'url(/noise.png)', opacity: 0.05, mixBlendMode: 'overlay' }} />
            </div>
          )}
          {/* Dark gradient overlay so text is readable */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to bottom, rgba(13, 13, 26, 0.2) 0%, var(--bg-background) 100%)', 
            pointerEvents: 'none' 
          }} />
        </div>

        <div className="container" style={{ marginTop: '-100px', position: 'relative', zIndex: 2 }}>
          {/* Profile header - Glassmorphic Card */}
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
            <div className="avatar avatar-ring" style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
              {user.image ? (
                <img src={user.image} alt={user.name || user.username} />
              ) : (
                (user.name || user.username).charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h1 className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: '4px' }}>
                {user.name || user.username}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                <p style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                  @{user.username}
                </p>
              </div>
              {user.bio && <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', maxWidth: '600px', lineHeight: 'var(--leading-relaxed)' }}>{user.bio}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-xl)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-md)' }}>
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
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user._count.following}</strong> 
                  <span style={{ color: 'var(--text-muted)' }}>Following</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>{user._count.followers}</strong> 
                  <span style={{ color: 'var(--text-muted)' }}>Followers</span>
                </span>
              </div>
            </div>
            <div style={{ alignSelf: 'flex-start' }}>
              {!isOwnProfile && (
                <FollowButton targetUserId={user.id} isFollowing={isFollowing} isLoggedIn={!!session?.user} />
              )}
              {isOwnProfile && (
                <EditProfileWrapper user={{ name: user.name, bio: user.bio, image: user.image, bannerImage: user.bannerImage }} />
              )}
            </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-3xl)' }}>
            {[
              { label: 'Games Played', value: gamesPlayed, icon: <GamepadIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Completed', value: gamesCompleted, icon: <CheckCircleIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: <StarIcon size={24} color="var(--accent-primary)" /> },
              { label: 'Reviews', value: user._count.reviews, icon: <EditIcon size={24} color="var(--accent-primary)" /> },
            ].map((stat) => (
              <div key={stat.label} className="card card-interactive" style={{ textAlign: 'center', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.4) 0%, rgba(13, 13, 26, 0.6) 100%)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <div style={{ marginBottom: 'var(--space-sm)', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 229, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stat.icon}</div>
                <div className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Library */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)' }}>Library</h2>
            {user.userGames.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><GamepadIcon size={48} color="var(--text-muted)" /></div>
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
