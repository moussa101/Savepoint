import {
  formatStatCount,
  formatStatHours,
  type GameCommunityStats,
} from '@/lib/game-stats';

type StatItem = { value: string; label: string; hint?: string; accent?: boolean };

export default function GameStatsBar({ stats }: { stats: GameCommunityStats }) {
  const timeHint =
    stats.timeToBeatCount > 0
      ? `IGDB story-length estimate · ${stats.timeToBeatCount} polls`
      : 'IGDB story-length estimate';

  const shelf: StatItem[] = [
    { value: formatStatCount(stats.plays), label: 'Plays' },
    { value: formatStatCount(stats.playing), label: 'Playing' },
    { value: formatStatCount(stats.backlogs), label: 'Backlogs' },
    { value: formatStatCount(stats.wishlists), label: 'Wishlists' },
    { value: formatStatCount(stats.ratings), label: 'Ratings' },
    { value: formatStatCount(stats.lists), label: 'Lists' },
    { value: formatStatCount(stats.reviews), label: 'Reviews' },
    { value: formatStatCount(stats.likes), label: 'Likes' },
  ];

  // Only show story-length tiles when IGDB has real data. Many FPS / live-service
  // titles never "finish", so blank estimates should stay hidden.
  const time: StatItem[] = [
    stats.finishPlaytimeMinutes != null
      ? {
          value: formatStatHours(stats.finishPlaytimeMinutes),
          label: 'Main',
          hint: `${timeHint} · main story / rush`,
          accent: true,
        }
      : null,
    stats.avgPlaytimeMinutes != null
      ? {
          value: formatStatHours(stats.avgPlaytimeMinutes),
          label: 'Main+',
          hint: `${timeHint} · main story + extras`,
          accent: true,
        }
      : null,
    stats.masterPlaytimeMinutes != null
      ? {
          value: formatStatHours(stats.masterPlaytimeMinutes),
          label: '100%',
          hint: `${timeHint} · completionist`,
          accent: true,
        }
      : null,
  ].filter((item): item is StatItem => item != null);

  const items = [...shelf, ...time];

  return (
    <section className="game-stats" aria-label="Community stats">
      <div className="game-stats-grid">
        {items.map((s) => (
          <div
            key={s.label}
            className={`game-stat-tile${s.accent ? ' game-stat-tile-accent' : ''}`}
            title={s.hint}
          >
            <div className="game-stat-value font-display">{s.value}</div>
            <div className="game-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {time.length > 0 ? (
        <p className="game-stats-source">
          Story length from IGDB — not meaningful for most multiplayer / live-service games
        </p>
      ) : (
        <p className="game-stats-source">Shelf counts from Savepoint</p>
      )}
    </section>
  );
}

export function GameStatsBarSkeleton() {
  return (
    <section className="game-stats" aria-busy="true" aria-label="Community stats loading">
      <div className="game-stats-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="game-stat-tile">
            <div className="skeleton" style={{ width: 36, height: 18, margin: '0 auto 6px' }} />
            <div className="skeleton" style={{ width: 48, height: 10, margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </section>
  );
}
