import Link from 'next/link';
import { getGeminiRecommendations } from '@/app/actions/recommendations';
import StarRating from './StarRating';

export default async function RecommendedGames() {
  const recommendations = await getGeminiRecommendations();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="landing-games" style={{ marginBottom: 'var(--space-3xl)' }}>
      <div className="section-header">
        <h2 className="section-title font-display" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ color: 'var(--accent-primary)', fontSize: '1.2em' }}>✨</span>
          Recommended for You
        </h2>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Powered by Google Gemini</div>
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
                <img src={game.coverUrl} alt={game.name} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
              )}
            </div>
            <div className="landing-game-info">
              <div className="landing-game-title">{game.name}</div>
              {game.rating > 0 && (
                <StarRating rating={game.rating} size="sm" />
              )}
              <div className="landing-game-genres">
                {game.genres?.slice(0, 2).map((g: string, i: number) => (
                  <span key={i} className="pill" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
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
