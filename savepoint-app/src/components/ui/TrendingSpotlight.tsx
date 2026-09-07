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
  heat?: number; // relative popularity signal (unused in rail layout)
  sourceLabel?: string;
};

function toFiveStar(rating: number | null | undefined, scale: 5 | 100 = 100) {
  if (rating == null || rating <= 0) return 0;
  return scale === 5 ? rating : (rating / 100) * 5;
}

export default function TrendingSpotlight({ games }: { games: TrendingGame[] }) {
  if (!games.length) return null;

  return (
    <section className="discover-rail" aria-labelledby="trending-title">
      <div className="section-header">
        <div>
          <h2
            id="trending-title"
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

      <div className="scroll-row">
        {games.map((game) => {
          const cover =
            game.coverUrl ||
            (game.coverImageId ? getIGDBImageUrl(game.coverImageId, 'cover_big') : null);
          const rating = toFiveStar(game.rating, game.ratingScale ?? 100);
          return (
            <Link
              href={`/games/${game.slug}`}
              key={game.id}
              className="discover-rail-card landing-game-card"
            >
              <div className="game-cover">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={game.name} loading="lazy" decoding="async" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
                )}
              </div>
              <div className="landing-game-info">
                <div className="landing-game-title">{game.name}</div>
                {rating > 0 && <StarRating rating={rating} size="sm" />}
                <div className="discover-rail-reason">{game.sourceLabel || 'Trending'}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
