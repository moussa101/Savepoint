import Link from 'next/link';
import { getIGDBImageUrl } from '@/lib/igdb';
import StarRating from '@/components/ui/StarRating';
import { FlameIcon } from '@/components/ui/Icons';

export type TrendingGame = {
  id: string | number;
  name: string;
  slug: string;
  coverUrl?: string | null;
  coverImageId?: string | null;
  rating?: number | null; // 0–5 or 0–100; normalized below
  ratingScale?: 5 | 100;
  blurb?: string | null;
  heat?: number; // relative popularity signal for bar width
  sourceLabel?: string;
};

function toFiveStar(rating: number | null | undefined, scale: 5 | 100 = 100) {
  if (rating == null || rating <= 0) return 0;
  return scale === 5 ? rating : (rating / 100) * 5;
}

export default function TrendingSpotlight({ games }: { games: TrendingGame[] }) {
  if (!games.length) return null;

  const [featured, ...rest] = games;
  const featuredCover =
    featured.coverUrl ||
    (featured.coverImageId ? getIGDBImageUrl(featured.coverImageId, 'cover_big') : null);
  const featuredRating = toFiveStar(featured.rating, featured.ratingScale ?? 100);
  const maxHeat = Math.max(...games.map((g) => g.heat || 1), 1);

  return (
    <section className="trending-spotlight" aria-labelledby="trending-spotlight-title">
      <div className="section-header" style={{ alignItems: 'flex-end' }}>
        <div>
          <h2
            id="trending-spotlight-title"
            className="section-title font-display"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 0 }}
          >
            <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>
              <FlameIcon size={24} />
            </span>
            Trending Now
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
            A shuffled mix of hot community titles and widely loved games
          </p>
        </div>
      </div>

      <div className="trending-spotlight-grid">
        <Link href={`/games/${featured.slug}`} className="trending-featured">
          <div className="trending-featured-cover">
            {featuredCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featuredCover} alt="" loading="lazy" decoding="async" />
            ) : (
              <div className="trending-featured-fallback" />
            )}
            <span className="trending-rank trending-rank-lg">01</span>
          </div>
          <div className="trending-featured-body">
            <span className="trending-chip">{featured.sourceLabel || 'Trending'}</span>
            <h3 className="trending-featured-title font-display">{featured.name}</h3>
            {featured.blurb && <p className="trending-featured-blurb">{featured.blurb}</p>}
            {featuredRating > 0 && <StarRating rating={featuredRating} size="sm" showValue />}
            <div className="trending-heat" aria-hidden>
              <div
                className="trending-heat-fill"
                style={{ width: `${Math.max(18, ((featured.heat || 1) / maxHeat) * 100)}%` }}
              />
            </div>
          </div>
        </Link>

        <ol className="trending-rank-list">
          {rest.map((game, i) => {
            const cover =
              game.coverUrl ||
              (game.coverImageId ? getIGDBImageUrl(game.coverImageId, 'cover_small') : null);
            const rating = toFiveStar(game.rating, game.ratingScale ?? 100);
            const rank = String(i + 2).padStart(2, '0');
            return (
              <li key={game.id}>
                <Link href={`/games/${game.slug}`} className="trending-rank-row">
                  <span className="trending-rank">{rank}</span>
                  <span className="trending-rank-cover">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="trending-rank-cover-fallback" />
                    )}
                  </span>
                  <span className="trending-rank-info">
                    <span className="trending-rank-name">{game.name}</span>
                    <span className="trending-rank-meta">
                      {game.sourceLabel || 'Popular'}
                      {rating > 0 ? ` · ${rating.toFixed(1)}★` : ''}
                    </span>
                    <span className="trending-heat trending-heat-sm" aria-hidden>
                      <span
                        className="trending-heat-fill"
                        style={{ width: `${Math.max(12, ((game.heat || 1) / maxHeat) * 100)}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
