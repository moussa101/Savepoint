import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Session } from 'next-auth';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import GameActions from './GameActions';
import ReviewSection from './ReviewSection';
import StorefrontLinks from '@/components/game/StorefrontLinks';
import UserAvatar from '@/components/ui/UserAvatar';
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

/** Local game rows are refreshed from IGDB at most once per day. */
const LOCAL_GAME_STALE_MS = 24 * 60 * 60 * 1000;

const userSummary = { select: { id: true, username: true, name: true, image: true } };

/**
 * Everything on the page that needs the database beyond the core game row.
 * Fired once, awaited by the streamed sections below — all queries run in a
 * single parallel round-trip.
 */
function loadCommunity(gameId: string, userId: string | undefined) {
  return Promise.all([
    prisma.review.findMany({
      where: { gameId },
      include: {
        user: userSummary,
        likes: { include: { user: userSummary } },
        comments: {
          include: { user: userSummary, likes: true, _count: { select: { likes: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.listItem.findMany({
      where: { gameId, list: { visibility: 'PUBLIC' } },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            user: { select: { username: true, name: true } },
            _count: { select: { items: true } },
          },
        },
      },
      take: 6,
    }),
    prisma.userGame.findMany({
      where: { gameId },
      include: { user: userSummary },
      take: 12,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.userGame.findMany({
      where: { gameId, rating: { not: null } },
      select: { rating: true },
    }),
    userId
      ? prisma.userGame.findUnique({ where: { userId_gameId: { userId, gameId } } })
      : Promise.resolve(null),
    userId
      ? prisma.favoriteGame.findUnique({ where: { userId_gameId: { userId, gameId } } })
      : Promise.resolve(null),
  ]);
}
type CommunityData = Awaited<ReturnType<typeof loadCommunity>>;

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Session, IGDB metadata and the local row are independent — one round-trip.
  const [session, igdbGame, existing] = await Promise.all([
    auth(),
    getIGDBGame(slug).catch((e) => {
      console.error(e);
      return null;
    }),
    prisma.game.findUnique({ where: { slug } }),
  ]);

  if (!igdbGame) notFound();

  const developer = igdbGame.involved_companies?.find((c) => c.developer)?.company.name;
  const publisher = igdbGame.involved_companies?.find((c) => c.publisher)?.company.name;
  const coverImage = getIGDBImageUrl(igdbGame.cover?.image_id, 'cover_big');
  const bannerImage = getIGDBImageUrl(igdbGame.artworks?.[0]?.image_id || igdbGame.screenshots?.[0]?.image_id, '1080p');
  const releaseDate = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : null;

  // 2. Most views are read-only; we only write when the game is new or its
  //    cached IGDB metadata is older than a day.
  const gameId = igdbGame.id.toString();
  const isStale =
    !existing ||
    existing.igdbId !== igdbGame.id ||
    Date.now() - existing.updatedAt.getTime() > LOCAL_GAME_STALE_MS;

  let game = existing;

  if (isStale) {
    try {
      game = await prisma.game.upsert({
        where: { slug: igdbGame.slug },
        update: {
          igdbId: igdbGame.id,
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
      });
    } catch (err) {
      // A concurrent request may have created it, or the igdbId is taken by a
      // row with a different slug — fall back to whatever exists.
      game =
        existing ??
        (await prisma.game.findFirst({
          where: { OR: [{ id: gameId }, { igdbId: igdbGame.id }] },
        }));
      if (!game) throw err;
    }
  }

  if (!game) notFound();

  // 3. Kick off the heavy community queries now, but don't block the header on them.
  const community = loadCommunity(game.id, session?.user?.id);

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content">
        {/* Banner */}
        <div className="game-banner">
          {game.bannerImage && <img src={game.bannerImage} alt="" className="game-banner-img" fetchPriority="high" />}
          <div className="game-banner-overlay" />
        </div>

        <div className="container" style={{ position: 'relative', marginTop: '-120px', zIndex: 2 }}>
          <div className="game-header">
            <div className="game-cover" style={{ width: '180px', height: '240px', flexShrink: 0 }}>
              {game.coverImage && <img src={game.coverImage} alt={game.name} fetchPriority="high" />}
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

          {/* Rating & Actions — streamed */}
          <Suspense fallback={<RatingSectionSkeleton avgRating={game.avgRating} ratingCount={game.ratingCount} />}>
            <RatingSection
              community={community}
              gameId={game.id}
              avgRating={game.avgRating}
              ratingCount={game.ratingCount}
              session={session}
            />
          </Suspense>

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

          {/* Lists, players, reviews — streamed */}
          <Suspense fallback={<CommunitySkeleton />}>
            <CommunitySection community={community} gameId={game.id} session={session} />
          </Suspense>
        </div>

        <div style={{ height: 'var(--space-3xl)' }} />
      </main>

    </SessionProvider>
  );
}

/* ------------------------------------------------------------------------ */
/* Streamed sections                                                         */
/* ------------------------------------------------------------------------ */

function buildDistribution(allRatings: { rating: number | null }[]) {
  const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
  for (const r of allRatings) {
    if (r.rating) {
      const bucket = Math.ceil(r.rating) - 1;
      if (bucket >= 0 && bucket < 5) distribution[bucket]++;
    }
  }
  return distribution;
}

function RatingSummary({ avgRating, ratingCount }: { avgRating: number; ratingCount: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="rating-large">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</div>
      <StarRating rating={avgRating} size="md" />
      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
        {ratingCount} rating{ratingCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function DistributionChart({ distribution }: { distribution: number[] }) {
  const maxDist = Math.max(...distribution, 1);
  return (
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
  );
}

/** Same layout as RatingSection so nothing shifts when the data arrives. */
function RatingSectionSkeleton({ avgRating, ratingCount }: { avgRating: number; ratingCount: number }) {
  return (
    <div className="game-rating-section card" style={{ marginTop: 'var(--space-xl)' }} aria-busy="true">
      <div style={{ display: 'flex', gap: 'var(--space-2xl)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <RatingSummary avgRating={avgRating} ratingCount={ratingCount} />
        <DistributionChart distribution={[0, 0, 0, 0, 0]} />
        <div className="skeleton" style={{ width: 200, height: 44, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );
}

async function RatingSection({
  community,
  gameId,
  avgRating,
  ratingCount,
  session,
}: {
  community: Promise<CommunityData>;
  gameId: string;
  avgRating: number;
  ratingCount: number;
  session: Session | null;
}) {
  const [, , , allRatings, userGame, favorite] = await community;
  const distribution = buildDistribution(allRatings);

  return (
    <div className="game-rating-section card" style={{ marginTop: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2xl)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <RatingSummary avgRating={avgRating} ratingCount={ratingCount} />
        <DistributionChart distribution={distribution} />
        <GameActions
          gameId={gameId}
          currentStatus={userGame?.status || null}
          currentRating={userGame?.rating || null}
          isFavorited={!!favorite}
          isLoggedIn={!!session?.user}
        />
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)' }} aria-busy="true">
      <div className="skeleton" style={{ width: 160, height: 24, marginBottom: 'var(--space-md)' }} />
      <div className="skeleton" style={{ width: '100%', height: 72, marginBottom: 'var(--space-sm)' }} />
      <div className="skeleton" style={{ width: '100%', height: 72 }} />
    </div>
  );
}

async function CommunitySection({
  community,
  gameId,
  session,
}: {
  community: Promise<CommunityData>;
  gameId: string;
  session: Session | null;
}) {
  const [reviews, listItems, userGames] = await community;
  const currentUserId = session?.user?.id;

  return (
    <>
      {/* Lists containing this game */}
      {listItems.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Lists featuring this game
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {listItems.map((item) => (
              <Link key={item.list.id} href={`/lists/${item.list.id}`} style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--bg-surface-border)' }}>
                <span style={{ fontWeight: 600 }}>{item.list.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  by {item.list.user.name || item.list.user.username} · {item.list._count.items} games
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Users who played */}
      {userGames.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Players on Savepoint
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {userGames.map((ug) => (
              <Link key={ug.id} href={`/profile/${ug.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', textDecoration: 'none', color: 'inherit' }}>
                <UserAvatar
                  className="avatar avatar-sm"
                  src={ug.user.image}
                  name={ug.user.name}
                  username={ug.user.username}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{ug.user.name || ug.user.username}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{ug.status.replaceAll('_', ' ')}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <ReviewSection
        gameId={gameId}
        reviews={reviews.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          likeCount: r.likes.length,
          commentCount: r._count.comments,
          isLiked: currentUserId ? r.likes.some((l) => l.userId === currentUserId) : false,
          isOwn: r.userId === currentUserId,
          comments: r.comments.map((c) => ({
            id: c.id,
            text: c.text,
            createdAt: c.createdAt.toISOString(),
            userId: c.userId,
            likeCount: c._count.likes,
            likedByMe: currentUserId ? c.likes.some((l) => l.userId === currentUserId) : false,
            user: c.user,
          })),
        }))}
        isLoggedIn={!!session}
        currentUserId={currentUserId || null}
      />
    </>
  );
}
