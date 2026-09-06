import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import { Suspense } from 'react';
import StarRating from '@/components/ui/StarRating';
import { GamepadIcon } from '@/components/ui/Icons';
import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';
import LiveSearch from '@/components/ui/LiveSearch';
import RecommendedGames from '@/components/ui/RecommendedGames';

export const metadata = {
  title: 'Browse Games — Savepoint',
  description: 'Discover and explore video games. Find popular, highly rated, and trending games.',
};

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { sort, q } = params;

  let query = `
    fields id, name, slug, total_rating, total_rating_count, first_release_date, 
           cover.image_id, genres.name;
    limit 48;
  `;

  if (q) {
    query += `\nsearch "${q.replace(/"/g, '')}";`;
  } else {
    if (sort === 'rating') {
      query += `\nsort total_rating desc;\nwhere total_rating_count > 50;`;
    } else if (sort === 'newest') {
      query += `\nsort first_release_date desc;\nwhere first_release_date != null;`;
    } else {
      query += `\nsort total_rating_count desc;\nwhere total_rating_count != null;`;
    }
  }

  let games: IGDBGame[] = [];
  try {
    games = await fetchIGDB('games', query);
  } catch (err) {
    console.error('Failed to fetch from IGDB:', err);
  }

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ padding: 'var(--space-xl)', paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
        <div className="container container-wide">
          <h1 className="page-title font-display">Discover</h1>

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

          {/* Search */}
          <LiveSearch initialQuery={q || ''} />

          {/* Sort options (only show if not searching) */}
          {!q && (
            <div className="filter-pills" style={{ marginBottom: 'var(--space-2xl)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginRight: 'var(--space-sm)' }}>Sort by:</span>
              {[
                { value: '', label: 'Popular' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'newest', label: 'Newest' },
              ].map((s) => (
                <Link
                  key={s.label}
                  href={`/games?${s.value ? `sort=${s.value}` : ''}`}
                  className={`filter-pill ${(sort || '') === s.value ? 'filter-pill-active' : ''}`}
                >
                  {s.label}
                </Link>
              ))}
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
      </main>
    </SessionProvider>
  );
}
