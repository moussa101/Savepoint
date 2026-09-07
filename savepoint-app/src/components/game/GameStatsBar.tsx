import {
  formatStatCount,
  formatStatHours,
  type GameCommunityStats,
} from '@/lib/game-stats';

type StatItem = { value: string; label: string; hint?: string };

export default function GameStatsBar({ stats }: { stats: GameCommunityStats }) {
  const shelf: StatItem[] = [
    { value: formatStatCount(stats.plays), label: 'Plays' },
    { value: formatStatCount(stats.playing), label: 'Playing' },
    { value: formatStatCount(stats.backlogs), label: 'Backlogs' },
    { value: formatStatCount(stats.wishlists), label: 'Wishlists' },
    { value: formatStatCount(stats.ratings), label: 'Ratings' },
  ];

  const social: StatItem[] = [
    { value: formatStatCount(stats.lists), label: 'Lists' },
    { value: formatStatCount(stats.reviews), label: 'Reviews' },
    { value: formatStatCount(stats.likes), label: 'Likes' },
  ];

  const timeHint =
    stats.timeToBeatCount > 0
      ? `IGDB time to beat · ${stats.timeToBeatCount} polls`
      : 'IGDB time to beat';

  const time: StatItem[] = [
    {
      value: formatStatHours(stats.avgPlaytimeMinutes),
      label: 'average',
      hint: `${timeHint} (normally)`,
    },
    {
      value: formatStatHours(stats.finishPlaytimeMinutes),
      label: 'to finish',
      hint: `${timeHint} (hastily / main)`,
    },
    {
      value: formatStatHours(stats.masterPlaytimeMinutes),
      label: 'to master',
      hint: `${timeHint} (completely)`,
    },
  ];

  return (
    <section className="game-stats" aria-label="Community stats">
      <div className="game-stats-row">
        {shelf.map((s) => (
          <div key={s.label} className="game-stat">
            <div className="game-stat-value font-display">{s.value}</div>
            <div className="game-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="game-stats-row game-stats-row-compact">
        {social.map((s) => (
          <div key={s.label} className="game-stat game-stat-sm">
            <div className="game-stat-value font-display">{s.value}</div>
            <div className="game-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="game-stats-row game-stats-time">
        {time.map((s) => (
          <div key={s.label} className="game-stat game-stat-time" title={s.hint}>
            <div className="game-stat-value font-display">{s.value}</div>
            <div className="game-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="game-stats-source">Finish times from IGDB · shelf counts from Savepoint</p>
    </section>
  );
}

export function GameStatsBarSkeleton() {
  return (
    <section className="game-stats" aria-busy="true" aria-label="Community stats loading">
      <div className="game-stats-row">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="game-stat">
            <div className="skeleton" style={{ width: 48, height: 28, margin: '0 auto 6px' }} />
            <div className="skeleton" style={{ width: 56, height: 12, margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </section>
  );
}
