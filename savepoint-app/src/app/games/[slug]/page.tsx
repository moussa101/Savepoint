import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import GameActions from './GameActions';
import ReviewSection from './ReviewSection';
import StorefrontLinks from '@/components/game/StorefrontLinks';
import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import { cache } from 'react';

const getIGDBGame = cache(async (slug: string) => {
  const igdbResults = await fetchIGDB(
    'games',
    `fields id, name, slug, summary, cover.image_id, artworks.image_id, screenshots.image_id, first_release_date, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, platforms.name, websites.type, websites.url;
     where slug = "${slug}"; limit 1;`
  );
  if (igdbResults && igdbResults.length > 0) {
    return igdbResults[0] as IGDBGame;
  }
  return null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const game = await getIGDBGame(slug);
    if (!game) return { title: 'Game Not Found' };
    return {
      title: `${game.name} — Savepoint`,
      description: game.summary?.slice(0, 160),
    };
  } catch (e) {
    return { title: 'Game Not Found' };
  }
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  // 1. Fetch from IGDB
  let igdbGame: IGDBGame | null = null;
  try {
    igdbGame = await getIGDBGame(slug);
  } catch (e) {
    console.error(e);
  }

  if (!igdbGame) notFound();

  const developer = igdbGame.involved_companies?.find((c) => c.developer)?.company.name;
  const publisher = igdbGame.involved_companies?.find((c) => c.publisher)?.company.name;
  const coverImage = getIGDBImageUrl(igdbGame.cover?.image_id, 'cover_big');
  const bannerImage = getIGDBImageUrl(igdbGame.artworks?.[0]?.image_id || igdbGame.screenshots?.[0]?.image_id, '1080p');
  const releaseDate = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : null;

  // 2. Upsert into local database to ensure relationships work
  const gameId = igdbGame.id.toString();
  
  let game;
  try {
    game = await prisma.game.upsert({
      where: { slug: igdbGame.slug },
      update: {
        name: igdbGame.name,
        slug: igdbGame.slug,
        description: igdbGame.summary,
        coverImage,
        bannerImage,
        releaseDate,
        developer,
        publisher,
      },
      create: {
        id: gameId,
        slug: igdbGame.slug,
        igdbId: igdbGame.id,
        name: igdbGame.name,
        description: igdbGame.summary,
        coverImage,
        bannerImage,
        releaseDate,
        developer,
        publisher,
      },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, username: true, name: true, image: true } },
            likes: {
              include: {
                user: { select: { id: true, username: true, name: true, image: true } }
              }
            },
            comments: {
              include: {
                user: { select: { id: true, username: true, name: true, image: true } }
              },
              orderBy: { createdAt: 'asc' }
            },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true, userGames: true } },
      },
    });
  } catch (err: any) {
    // If a concurrent request created it just now, or there's a slug conflict, try fetching it
    game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, username: true, name: true, image: true } },
            likes: {
              include: {
                user: { select: { id: true, username: true, name: true, image: true } }
              }
            },
            comments: {
              include: {
                user: { select: { id: true, username: true, name: true, image: true } }
              },
              orderBy: { createdAt: 'asc' }
            },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reviews: true, userGames: true } },
      }
    });
    
    if (!game) throw err;
  }

  // 3. Determine user context tracking status for this game
  let userGame = null;
  let isFavorited = false;
  
  if (session?.user?.id) {
    const [ug, fg] = await Promise.all([
      prisma.userGame.findUnique({
        where: {
          userId_gameId: {
            userId: session.user.id,
            gameId: game.id,
          },
        },
      }),
      prisma.favoriteGame.findUnique({
        where: {
          userId_gameId: {
            userId: session.user.id,
            gameId: game.id,
          },
        },
      })
    ]);
    userGame = ug;
    isFavorited = !!fg;
  }

  // Rating distribution
  const allRatings = await prisma.userGame.findMany({
    where: { gameId: game.id, rating: { not: null } },
    select: { rating: true },
  });

  const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
  allRatings.forEach((r) => {
    if (r.rating) {
      const bucket = Math.ceil(r.rating) - 1;
      if (bucket >= 0 && bucket < 5) {
        distribution[bucket]++;
      }
    }
  });

  const maxDist = Math.max(...distribution, 1);

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content">
        {/* Banner */}
        <div className="game-banner">
          {game.bannerImage && <img src={game.bannerImage} alt="" className="game-banner-img" />}
          <div className="game-banner-overlay" />
        </div>

        <div className="container" style={{ position: 'relative', marginTop: '-120px', zIndex: 2 }}>
          <div className="game-header">
            <div className="game-cover" style={{ width: '180px', height: '240px', flexShrink: 0 }}>
              {game.coverImage && <img src={game.coverImage} alt={game.name} />}
            </div>
            <div className="game-header-info">
              <h1 className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, marginBottom: 'var(--space-sm)' }}>
                {game.name}
              </h1>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                {game.developer && <span>Developer: <strong>{game.developer}</strong></span>}
                {game.publisher && <span> | Publisher: <strong>{game.publisher}</strong></span>}
                {game.releaseDate && (
                  <span> | Release: <strong>{new Date(game.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                {igdbGame.platforms?.map((p) => (
                  <span key={p.id} className="pill pill-platform">{p.name}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {igdbGame.genres?.map((g) => (
                  <span key={g.id} className="pill">{g.name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Rating & Actions */}
          <div className="game-rating-section card" style={{ marginTop: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2xl)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="rating-large">{game.avgRating > 0 ? game.avgRating.toFixed(1) : '—'}</div>
                <StarRating rating={game.avgRating} size="md" />
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
                  {game.ratingCount} rating{game.ratingCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Distribution chart */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: '20px' }}>{star}★</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(distribution[star - 1] / maxDist) * 100}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, var(--star-gold), #f59e0b)`,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>
                      {distribution[star - 1]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <GameActions
                gameId={game.id}
                currentStatus={userGame?.status || null}
                currentRating={userGame?.rating || null}
                isFavorited={isFavorited}
                isLoggedIn={!!session?.user}
              />
            </div>
          </div>

          {/* Storefronts */}
          <StorefrontLinks websites={igdbGame.websites || []} />

          {/* Description */}
          {game.description && (
            <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
              <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                About
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                {game.description}
              </p>
            </div>
          )}

          {/* Reviews */}
          <ReviewSection
            gameId={game.id}
            reviews={game.reviews.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
              likeCount: r.likes.length,
              commentCount: r._count.comments,
              isLiked: session?.user?.id ? r.likes.some((l) => l.userId === session.user.id) : false,
              isOwn: r.userId === session?.user?.id,
            }))}
            isLoggedIn={!!session}
            currentUserId={session?.user?.id || null}
          />
        </div>

        <div style={{ height: 'var(--space-3xl)' }} />
      </main>

    </SessionProvider>
  );
}
