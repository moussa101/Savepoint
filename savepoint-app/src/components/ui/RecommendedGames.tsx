import Link from 'next/link';
import { getRecommendations } from '@/app/actions/recommendations';
import StarRating from './StarRating';
import { StarIcon } from '@/components/ui/Icons';

export default async function RecommendedGames() {
  const recommendations = await getRecommendations();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: 'var(--space-2xl)' }}>
      <div className="section-header">
        <h2 className="section-title font-display" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><StarIcon size={24} /></span>
          Recommended for You
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
          Live picks based on your ratings, genres, and similar titles
        </p>
      </div>

      <div className="scroll-row">
        {recommendations.map((game) => (
          <Link
            href={`/games/${game.slug}`}
            key={game.id}
            className="landing-game-card"
          >
            <div className="game-cover">
              {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.name} loading="lazy" decoding="async" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
              )}
            </div>
            <div className="landing-game-info">
              <div className="landing-game-title">{game.name}</div>
              {game.rating > 0 && (
                <StarRating rating={game.rating} size="sm" />
              )}
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {game.reason}
              </div>
              <div className="landing-game-genres">
                {game.genres?.slice(0, 2).map((g) => (
                  <span key={g} className="pill" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
