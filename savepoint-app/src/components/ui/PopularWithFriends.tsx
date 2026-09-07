import Link from 'next/link';
import { getPopularWithFriends } from '@/app/actions/popular-with-friends';
import StarRating from './StarRating';
import { UsersIcon } from '@/components/ui/Icons';

export default async function PopularWithFriends() {
  const games = await getPopularWithFriends();

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <section className="discover-rail" aria-labelledby="popular-friends-title">
      <div className="section-header">
        <div>
          <h2
            id="popular-friends-title"
            className="section-title font-display"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 0 }}
          >
            <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>
              <UsersIcon size={24} />
            </span>
            Popular with Friends
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
            What your friends have been playing this week
          </p>
        </div>
      </div>

      <div className="scroll-row">
        {games.map((game) => (
          <Link href={`/games/${game.slug}`} key={game.id} className="discover-rail-card landing-game-card">
            <div className="game-cover">
              {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.name} loading="lazy" decoding="async" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
              )}
            </div>
            <div className="landing-game-info">
              <div className="landing-game-title">{game.name}</div>
              {game.rating > 0 && <StarRating rating={game.rating} size="sm" />}
              <div className="discover-rail-reason">{game.reason}</div>
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
