import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import { Suspense } from 'react';
import StarRating from '@/components/ui/StarRating';
import { GamepadIcon } from '@/components/ui/Icons';
import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import LiveSearch from '@/components/ui/LiveSearch';
import RecommendedGames from '@/components/ui/RecommendedGames';
import GamesHeroCarousel from '@/components/ui/GamesHeroCarousel';
import GameFilters from '@/components/ui/GameFilters';
import { getPopularLists } from '@/app/actions/lists';
import ListCard from '@/components/ui/ListCard';

export const metadata = {
  title: 'Discover Games — Savepoint',
  description: 'Discover and explore video games. Find popular, highly rated, and trending games.',
};

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

  let whereClauses: string[] = [];
  
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
    } else { // popular_desc or default
      whereClauses.push('total_rating_count != null');
      query += `\nsort total_rating_count desc;`;
    }
  }

  if (whereClauses.length > 0) {
    query += `\nwhere ${whereClauses.join(' & ')};`;
  }

  let games: IGDBGame[] = [];
  let heroGames: IGDBGame[] = [];
  let popularLists: any[] = [];
  
  try {
    const [gamesRes, heroRes, listsRes] = await Promise.all([
      fetchIGDB('games', query),
      fetchIGDB('games', `
        fields name, slug, summary, total_rating, artworks.image_id, cover.image_id;
        where artworks != null & total_rating_count > 1000 & rating > 85;
        sort total_rating_count desc;
        limit 30;
      `),
      getPopularLists(),
    ]);
    games = gamesRes;
    // Shuffle the top 30 games and pick 10 random ones for the carousel
    heroGames = heroRes.sort(() => 0.5 - Math.random()).slice(0, 10);
    popularLists = listsRes;
  } catch (err) {
    console.error('Failed to fetch from IGDB:', err);
  }

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ padding: 'var(--space-xl)', paddingTop: 'var(--navbar-height)' }}>
        
        {!q && heroGames.length > 0 && (
          <GamesHeroCarousel games={heroGames} />
        )}

        <div className="container container-wide">
          <h1 className="page-title font-display" style={{ marginTop: q ? 'var(--space-xl)' : 0 }}>Discover</h1>

          {!q && (
            <Suspense fallback={
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ width: '200px', height: '24px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }} className="animate-pulse" />
                <div className="scroll-row">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="landing-game-card">
                      <div className="game-cover animate-pulse" style={{ background: 'var(--bg-surface-hover)' }} />
                      <div className="landing-game-info">
                        <div className="animate-pulse" style={{ width: '80%', height: '16px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <RecommendedGames />
            </Suspense>
          )}

          {/* Search Section Header */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title font-display">Explore All Games</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              Search the complete IGDB database of over 200,000 games.
            </p>
          </div>

          <div className="discovery-layout">
            <aside className="discovery-sidebar">
              <GameFilters />
            </aside>
            
            <div className="discovery-content">
              {/* Search */}
              <LiveSearch initialQuery={q || ''} />

              {/* Community Curated Lists */}
              {!q && popularLists.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h2 className="section-title font-display" style={{ margin: 0 }}>Popular Community Lists</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
                    {popularLists.map(list => (
                      <ListCard key={list.id} list={list} showAuthor={true} />
                    ))}
                  </div>
                </div>
              )}

          {/* Games Grid */}
          {games.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><GamepadIcon size={48} color="var(--text-muted)" /></div>
              <div className="empty-state-title">No games found</div>
              <div className="empty-state-text">Try adjusting your search query.</div>
            </div>
          ) : (
            <div className="game-grid game-grid-lg">
              {games.map((game) => {
                const coverUrl = getIGDBImageUrl(game.cover?.image_id, 'cover_big');
                // Convert 0-100 rating to 0-5
                const normalizedRating = game.total_rating ? (game.total_rating / 100) * 5 : 0;
                
                return (
                  <Link
                    key={game.id}
                    href={`/games/${game.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="game-cover" style={{ marginBottom: 'var(--space-sm)' }}>
                      {coverUrl ? (
                        <img src={coverUrl} alt={game.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          No Cover
                        </div>
                      )}
                      <div className="game-cover-overlay">
                        <span className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                          View Game
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    </SessionProvider>
  );
}
