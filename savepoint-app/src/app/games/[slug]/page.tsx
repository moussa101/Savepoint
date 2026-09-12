import { prisma } from '@/lib/db';
import { notFound, permanentRedirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Session } from 'next-auth';
import Navbar from '@/components/layout/Navbar';
import StarRating from '@/components/ui/StarRating';
import GameActions from './GameActions';
import ReviewSection from './ReviewSection';
import StorefrontLinks from '@/components/game/StorefrontLinks';
import GameStatsBar, { GameStatsBarSkeleton } from '@/components/game/GameStatsBar';
import GameTrophySection, { GameTrophySectionSkeleton } from '@/components/game/GameTrophySection';
import UserAvatar from '@/components/ui/UserAvatar';
import { getIGDBImageUrl } from '@/lib/igdb';
import { getGameCommunityStats } from '@/lib/game-stats';
import { isGameUnreleased } from '@/lib/game-release';
import { notifyReleaseWatchersForGame } from '@/lib/release-notify';
import {
  canonicalizeLocalGame,
  findLocalGameForIgdb,
  resolveIgdbGameFromSlug,
} from '@/lib/resolve-game';
import { absoluteUrl, videoGameJsonLd, breadcrumbJsonLd } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const game = await resolveIgdbGameFromSlug(slug);
    if (!game) return { title: 'Game Not Found' };

    const description =
      game.summary?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
      `Track, rate, and review ${game.name} on Savepoint.`;
    const cover = game.cover?.image_id
      ? getIGDBImageUrl(game.cover.image_id, 'cover_big')
      : undefined;
    const url = `/games/${game.slug || slug}`;

    return {
      title: `${game.name} reviews & library tracking`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${game.name} · Savepoint`,
        description,
        url,
        type: 'website',
        images: cover ? [{ url: cover, alt: game.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${game.name} · Savepoint`,
        description,
        images: cover ? [cover] : undefined,
      },
    };
  } catch {
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
    userId
      ? prisma.gameReleaseWatch.findUnique({ where: { userId_gameId: { userId, gameId } } })
      : Promise.resolve(null),
  ]);
}
type CommunityData = Awaited<ReturnType<typeof loadCommunity>>;

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [session, igdbGame] = await Promise.all([
    auth(),
    resolveIgdbGameFromSlug(slug),
  ]);

  if (!igdbGame) notFound();

  const developer = igdbGame.involved_companies?.find((c) => c.developer)?.company.name ?? null;
  const publisher = igdbGame.involved_companies?.find((c) => c.publisher)?.company.name ?? null;
  const coverImage = getIGDBImageUrl(igdbGame.cover?.image_id, 'cover_big');
  const bannerImage = getIGDBImageUrl(
    igdbGame.artworks?.[0]?.image_id || igdbGame.screenshots?.[0]?.image_id,
    '1080p'
  );
  const releaseDate = igdbGame.first_release_date
    ? new Date(igdbGame.first_release_date * 1000)
    : null;

  const existing = await findLocalGameForIgdb(igdbGame, slug);
  const gameId = igdbGame.id.toString();
  const isStale =
    !existing ||
    existing.igdbId !== igdbGame.id ||
    existing.slug !== igdbGame.slug ||
    Date.now() - existing.updatedAt.getTime() > LOCAL_GAME_STALE_MS;

  let game = existing;

  if (isStale) {
    try {
      if (existing) {
        game = await canonicalizeLocalGame(existing, igdbGame, {
          coverImage,
          bannerImage,
          releaseDate,
          developer,
          publisher,
          description: igdbGame.summary ?? null,
        });
      } else {
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
      }
    } catch (err) {
      game =
        existing ??
        (await prisma.game.findFirst({
          where: { OR: [{ id: gameId }, { igdbId: igdbGame.id }, { slug: igdbGame.slug }] },
        }));
      if (!game) throw err;
    }
  }

  if (!game) notFound();

  // Legacy Steam sync used synthetic slugs (`fallout-new-vegas-16`). After healing
  // the local row, send browsers to the canonical IGDB slug.
  if (igdbGame.slug && igdbGame.slug !== slug) {
    permanentRedirect(`/games/${igdbGame.slug}`);
  }

  const unreleased = isGameUnreleased(game.releaseDate);

  // Fire release alerts if this title just launched and people were watching.
  if (!unreleased) {
    void notifyReleaseWatchersForGame(game.id).catch(() => null);
  }

  // 3. Kick off the heavy community queries now, but don't block the header on them.
  const community = loadCommunity(game.id, session?.user?.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            videoGameJsonLd({
              name: game.name,
              description: game.description,
              image: game.coverImage,
              url: absoluteUrl(`/games/${igdbGame.slug || slug}`),
              datePublished: game.releaseDate
                ? new Date(game.releaseDate).toISOString().slice(0, 10)
                : null,
              genre: igdbGame.genres?.map((g) => g.name).filter(Boolean) as string[],
              aggregateRating:
                game.ratingCount > 0
                  ? { ratingValue: game.avgRating, ratingCount: game.ratingCount }
                  : undefined,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: absoluteUrl('/') },
              { name: 'Games', url: absoluteUrl('/games') },
              { name: game.name, url: absoluteUrl(`/games/${igdbGame.slug || slug}`) },
            ])
          ),
        }}
      />
      <Navbar />
      <main className="main-content">
        {/* Banner */}
        <div className="game-banner">
          {game.bannerImage && <img src={game.bannerImage} alt="" className="game-banner-img" fetchPriority="high" />}
          <div className="game-banner-overlay" />
        </div>

        <div className="container game-page-body" style={{ position: 'relative', marginTop: '-120px', zIndex: 2 }}>
          <div className="game-header">
            <div className="game-cover game-header-cover" style={{ width: '180px', height: '240px', flexShrink: 0 }}>
              {game.coverImage && <img src={game.coverImage} alt={game.name} fetchPriority="high" />}
            </div>
            <div className="game-header-info">
              <h1 className="font-display game-header-title" style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, marginBottom: 'var(--space-sm)' }}>
                {game.name}
              </h1>
              <div className="game-header-meta" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                {game.developer && <span>Developer: <strong>{game.developer}</strong></span>}
                {game.publisher && (
                  <span>
                    <span className="meta-sep"> | </span>
                    Publisher: <strong>{game.publisher}</strong>
                  </span>
                )}
                {game.releaseDate && (
                  <span>
                    <span className="meta-sep"> | </span>
                    {unreleased ? 'Releases' : 'Release'}:{' '}
                    <strong>
                      {new Date(game.releaseDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </strong>
                    {unreleased && (
                      <span className="pill" style={{ marginLeft: 8 }}>
                        Coming soon
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="game-header-pills" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                {igdbGame.platforms?.map((p) => (
                  <span key={p.id} className="pill pill-platform">{p.name}</span>
                ))}
              </div>
              <div className="game-header-pills" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {igdbGame.genres?.map((g) => (
                  <span key={g.id} className="pill">{g.name}</span>
                ))}
              </div>
            </div>
          </div>

          <Suspense fallback={<GameStatsBarSkeleton />}>
            <GameStatsSection gameId={game.id} igdbId={game.igdbId ?? igdbGame.id} />
          </Suspense>

          {/* Rating & Actions — streamed */}
          <Suspense fallback={<RatingSectionSkeleton avgRating={game.avgRating} ratingCount={game.ratingCount} />}>
            <RatingSection
              community={community}
              gameId={game.id}
              avgRating={game.avgRating}
              ratingCount={game.ratingCount}
              session={session}
              isUnreleased={unreleased}
            />
          </Suspense>

          {/* Storefronts */}
          <StorefrontLinks websites={igdbGame.websites || []} />

          <Suspense fallback={<GameTrophySectionSkeleton />}>
            <GameTrophySection gameId={game.id} />
          </Suspense>

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
            <CommunitySection
              community={community}
              gameId={game.id}
              session={session}
              isUnreleased={unreleased}
            />
          </Suspense>
        </div>

        <div style={{ height: 'var(--space-3xl)' }} />
      </main>

    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Streamed sections                                                         */
/* ------------------------------------------------------------------------ */

async function GameStatsSection({
  gameId,
  igdbId,
}: {
  gameId: string;
  igdbId: number;
}) {
  const stats = await getGameCommunityStats(gameId, igdbId);
  return <GameStatsBar stats={stats} />;
}

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
        <div className="game-actions-wrap skeleton" style={{ width: '100%', maxWidth: 280, height: 120, borderRadius: 'var(--radius-md)' }} />
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
  isUnreleased,
}: {
  community: Promise<CommunityData>;
  gameId: string;
  avgRating: number;
  ratingCount: number;
  session: Session | null;
  isUnreleased: boolean;
}) {
  const [, , , allRatings, userGame, favorite, releaseWatch] = await community;
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
          isUnreleased={isUnreleased}
          isWatchingRelease={!!releaseWatch}
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
  isUnreleased,
}: {
  community: Promise<CommunityData>;
  gameId: string;
  session: Session | null;
  isUnreleased: boolean;
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
        isUnreleased={isUnreleased}
      />
    </>
  );
}
