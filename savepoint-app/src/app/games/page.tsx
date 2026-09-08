import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { Suspense } from 'react';
import StarRating from '@/components/ui/StarRating';
import { GamepadIcon } from '@/components/ui/Icons';
import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import LiveSearch from '@/components/ui/LiveSearch';
import RecommendedGames from '@/components/ui/RecommendedGames';
import PopularWithFriends from '@/components/ui/PopularWithFriends';
import GamesHeroCarousel from '@/components/ui/GamesHeroCarousel';
import TrendingSpotlight from '@/components/ui/TrendingSpotlight';
import GameFilters from '@/components/ui/GameFilters';
import ListCard from '@/components/ui/ListCard';
import { getPopularListsCached, getRecentReviewsCached, getTrendingGamesCached } from '@/lib/cached-queries';
import { formatRelativeTime } from '@/lib/utils';
import { shuffleCopy, shuffleTier } from '@/lib/shuffle';

export const metadata = {
  title: 'Discover Games — Savepoint',
  description: 'Discover and explore video games. Find popular, highly rated, and trending games.',
};

/** Page can be statically regenerated; hero shuffle is fine from cached pools. */
export const revalidate = 300;

function dedupeById<T extends { id: number | string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; genres?: string; platforms?: string; year?: string }>;
}) {
  const params = await searchParams;
  const { sort, q, genres, platforms, year } = params;

  let query = `
    fields id, name, slug, total_rating, total_rating_count, first_release_date, 
           cover.image_id, genres.name;
    limit 48;
  `;

  const whereClauses: string[] = [];

  if (genres) {
    whereClauses.push(`genres = (${genres})`);
  }

  if (platforms) {
    whereClauses.push(`platforms = (${platforms})`);
  }

  if (year) {
    const startOfYear = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
    const endOfYear = Math.floor(new Date(`${year}-12-31T23:59:59`).getTime() / 1000);
    whereClauses.push(`first_release_date >= ${startOfYear}`);
    whereClauses.push(`first_release_date <= ${endOfYear}`);
  }

  if (q) {
    query += `\nsearch "${q.replace(/"/g, '')}";`;
  } else {
    if (sort === 'rating_desc') {
      whereClauses.push('total_rating_count > 50');
      query += `\nsort total_rating desc;`;
    } else if (sort === 'rating_asc') {
      whereClauses.push('total_rating_count > 50');
      query += `\nsort total_rating asc;`;
    } else if (sort === 'newest') {
      whereClauses.push('first_release_date != null');
      query += `\nsort first_release_date desc;`;
    } else if (sort === 'oldest') {
      whereClauses.push('first_release_date != null');
      query += `\nsort first_release_date asc;`;
    } else if (sort === 'popular_asc') {
      whereClauses.push('total_rating_count != null');
      query += `\nsort total_rating_count asc;`;
    } else {
      whereClauses.push('total_rating_count != null');
      query += `\nsort total_rating_count desc;`;
    }
  }

  if (whereClauses.length > 0) {
    query += `\nwhere ${whereClauses.join(' & ')};`;
  }

  let games: IGDBGame[] = [];
  let heroGames: IGDBGame[] = [];
  let trendingGames: Parameters<typeof TrendingSpotlight>[0]['games'] = [];
  let popularLists: Awaited<ReturnType<typeof getPopularListsCached>> = [];
  let recentReviews: Awaited<ReturnType<typeof getRecentReviewsCached>> = [];

  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    const twoYearsAgo = nowUnix - 60 * 60 * 24 * 730;

    const [gamesRes, popularPool, recentHits, cultFavorites, communityTrending, listsRes, reviewsRes] =
      await Promise.all([
        fetchIGDB('games', query),
        // Blockbusters — popular & well-rated
        fetchIGDB(
          'games',
          `
        fields id, name, slug, summary, total_rating, total_rating_count, artworks.image_id, cover.image_id;
        where artworks != null & total_rating_count > 800 & total_rating > 78;
        sort total_rating_count desc;
        limit 40;
      `
        ),
        // Recent popular releases
        fetchIGDB(
          'games',
          `
        fields id, name, slug, summary, total_rating, total_rating_count, artworks.image_id, cover.image_id;
        where first_release_date > ${twoYearsAgo} & first_release_date < ${nowUnix}
          & total_rating_count > 200 & total_rating > 70 & cover != null;
        sort total_rating_count desc;
        limit 24;
      `
        ),
        // Highly rated with fewer ratings (cult / underrated)
        fetchIGDB(
          'games',
          `
        fields id, name, slug, summary, total_rating, total_rating_count, artworks.image_id, cover.image_id;
        where total_rating > 88 & total_rating_count > 80 & total_rating_count < 2500 & cover != null;
        sort total_rating desc;
        limit 20;
      `
        ),
        getTrendingGamesCached(),
        getPopularListsCached(),
        getRecentReviewsCached(),
      ]);

    games = gamesRes;

    // Hero: shuffle within tiers so every visit feels random but still popular-heavy.
    const heroPool = dedupeById(
      shuffleTier([
        popularPool.slice(0, 18) as IGDBGame[],
        recentHits.slice(0, 12) as IGDBGame[],
        cultFavorites.slice(0, 10) as IGDBGame[],
      ])
    ).filter((g) => g.artworks?.[0]?.image_id || g.cover?.image_id);

    heroGames = heroPool.slice(0, 12);

    // Trending spotlight: community activity + IGDB heat, shuffled, ranked layout.
    const communityMapped = shuffleCopy(communityTrending).map((g, i) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      coverUrl: g.coverImage,
      rating: g.avgRating,
      ratingScale: 5 as const,
      heat: Math.max(g.ratingCount, 1) * 3 + (12 - i),
      sourceLabel: 'Community',
      blurb: g.ratingCount > 0 ? `${g.ratingCount} ratings on Savepoint` : null,
    }));

    const igdbMapped = shuffleCopy(
      dedupeById([...recentHits, ...popularPool.slice(0, 15), ...cultFavorites])
    )
      .filter((g) => !communityMapped.some((c) => c.slug === g.slug))
      .slice(0, 14)
      .map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        coverImageId: g.cover?.image_id || null,
        rating: g.total_rating ?? null,
        ratingScale: 100 as const,
        heat: g.total_rating_count || 1,
        sourceLabel: (g.total_rating_count || 0) > 2000 ? 'Popular' : 'Rising',
        blurb: g.summary || null,
      }));

    // Interleave community + IGDB, keep community presence, then reshuffle lightly in windows.
    const interleaved: typeof trendingGames = [];
    const a = communityMapped.slice(0, 5);
    const b = igdbMapped;
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < a.length) interleaved.push(a[i]);
      if (i < b.length) interleaved.push(b[i]);
    }

    trendingGames = shuffleCopy(interleaved).slice(0, 9);
    // Promote one high-heat title to #1 so the featured slot still feels “trending”.
    trendingGames.sort((x, y) => (y.heat || 0) - (x.heat || 0));
    const top = trendingGames[0];
    const rest = shuffleCopy(trendingGames.slice(1));
    trendingGames = top ? [top, ...rest] : rest;

    popularLists = listsRes;
    recentReviews = reviewsRes;
  } catch (err) {
    console.error('Failed to fetch from IGDB:', err);
  }

  return (
    <>
      <Navbar />
      <main className="main-content main-content-padded">
        <div className="container container-wide">
          {!q && heroGames.length > 0 && <GamesHeroCarousel games={heroGames} />}

          <h1 className="page-title font-display" style={{ marginTop: q ? 'var(--space-xl)' : 0 }}>
            Discover
          </h1>

          {!q && trendingGames.length > 0 && <TrendingSpotlight games={trendingGames} />}

          {!q && (
            <>
              <Suspense
                fallback={
                  <div className="discover-rail">
                    <div
                      style={{
                        width: 220,
                        height: 24,
                        background: 'var(--bg-surface-hover)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 'var(--space-md)',
                      }}
                      className="animate-pulse"
                    />
                    <div className="scroll-row">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="discover-rail-card landing-game-card">
                          <div className="game-cover animate-pulse" style={{ background: 'var(--bg-surface-hover)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <RecommendedGames />
              </Suspense>

              <Suspense
                fallback={
                  <div className="discover-rail">
                    <div
                      style={{
                        width: 240,
                        height: 24,
                        background: 'var(--bg-surface-hover)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 'var(--space-md)',
                      }}
                      className="animate-pulse"
                    />
                    <div className="scroll-row">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="discover-rail-card landing-game-card">
                          <div className="game-cover animate-pulse" style={{ background: 'var(--bg-surface-hover)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <PopularWithFriends />
              </Suspense>
            </>
          )}

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title font-display">Explore All Games</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              Search and filter the IGDB catalog.
            </p>
          </div>

          <div className="discovery-layout">
            <aside className="discovery-sidebar">
              <GameFilters />
            </aside>

            <div className="discovery-content">
              <LiveSearch initialQuery={q || ''} />

              {!q && popularLists.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2xl)' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-md)',
                    }}
                  >
                    <h2 className="section-title font-display" style={{ margin: 0 }}>
                      Popular Community Lists
                    </h2>
                  </div>
                  <div className="responsive-card-grid" style={{ gap: 'var(--space-xl)' }}>
                    {popularLists.map((list) => (
                      <ListCard key={list.id} list={list} showAuthor={true} />
                    ))}
                  </div>
                </div>
              )}

              {!q && recentReviews.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2xl)' }}>
                  <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-md)' }}>
                    Recently Reviewed
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {recentReviews.map((review) => (
                      <Link
                        key={review.id}
                        href={`/games/${review.game.slug}`}
                        className="card"
                        style={{ display: 'flex', gap: 'var(--space-md)', textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="game-cover" style={{ width: 48, height: 64, flexShrink: 0 }}>
                          {review.game.coverImage && (
                            <img src={review.game.coverImage} alt="" loading="lazy" decoding="async" />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{review.game.name}</div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>
                            by {review.user.name || review.user.username} · {formatRelativeTime(review.createdAt)}
                          </div>
                          <StarRating rating={review.rating} size="sm" />
                          <p
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: 'var(--text-secondary)',
                              marginTop: 4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {review.text}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {games.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <GamepadIcon size={48} color="var(--text-muted)" />
                  </div>
                  <div className="empty-state-title">No games found</div>
                  <div className="empty-state-text">Try adjusting your search query.</div>
                </div>
              ) : (
                <div className="game-grid game-grid-lg">
                  {games.map((game) => {
                    const coverUrl = getIGDBImageUrl(game.cover?.image_id, 'cover_big');
                    const normalizedRating = game.total_rating ? (game.total_rating / 100) * 5 : 0;

                    return (
                      <Link key={game.id} href={`/games/${game.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="game-cover" style={{ marginBottom: 'var(--space-sm)' }}>
                          {coverUrl ? (
                            <img src={coverUrl} alt={game.name} loading="lazy" decoding="async" />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: 'var(--bg-surface-hover)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                              }}
                            >
                              No Cover
                            </div>
                          )}
                          <div className="game-cover-overlay">
                            <span className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                              View Game
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {game.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          {normalizedRating > 0 ? (
                            <StarRating rating={normalizedRating} size="sm" showValue />
                          ) : (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Not rated</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {game.genres?.slice(0, 2).map((g) => (
                            <span key={g.id} className="pill" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
