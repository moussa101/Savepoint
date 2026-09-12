import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { PlaystationIcon } from '@/components/ui/Icons';
import SyncGameTrophiesButton from '@/components/game/SyncGameTrophiesButton';

const TYPE_COLOR: Record<string, string> = {
  platinum: '#E5E4E2',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

type Props = {
  gameId: string;
  /** When set, show this user's trophies (e.g. profile). Defaults to the signed-in user. */
  userId?: string;
};

export default async function GameTrophySection({
  gameId,
  userId: forcedUserId,
}: Props) {
  const session = await auth();
  const userId = forcedUserId || session?.user?.id;
  if (!userId) {
    return null;
  }

  const progress = await prisma.psnTitleProgress.findFirst({
    where: { userId, gameId },
    select: {
      npCommunicationId: true,
      platform: true,
      progress: true,
      earnedBronze: true,
      earnedSilver: true,
      earnedGold: true,
      earnedPlatinum: true,
      definedBronze: true,
      definedSilver: true,
      definedGold: true,
      definedPlatinum: true,
    },
  });

  if (!progress) {
    return null;
  }

  // Lightweight count first; only pull the full list when something is stored.
  const trophyCount = await prisma.psnTrophy.count({
    where: { userId, npCommunicationId: progress.npCommunicationId },
  });

  const trophies =
    trophyCount > 0
      ? await prisma.psnTrophy.findMany({
          where: { userId, npCommunicationId: progress.npCommunicationId },
          orderBy: [{ earned: 'desc' }, { trophyType: 'asc' }, { trophyId: 'asc' }],
          select: {
            id: true,
            trophyName: true,
            trophyDetail: true,
            trophyType: true,
            trophyIconUrl: true,
            earned: true,
            earnedDateTime: true,
            earnedRate: true,
          },
        })
      : [];

  const isOwn = !forcedUserId || forcedUserId === session?.user?.id;
  const earnedCount = trophies.filter((t) => t.earned).length;
  const definedTotal =
    progress.definedBronze +
    progress.definedSilver +
    progress.definedGold +
    progress.definedPlatinum;
  const earnedTotal =
    progress.earnedBronze +
    progress.earnedSilver +
    progress.earnedGold +
    progress.earnedPlatinum;

  return (
    <div className="card game-trophy-section" style={{ marginTop: 'var(--space-xl)' }}>
      <div className="game-trophy-header">
        <div>
          <h2 className="font-display game-trophy-title">
            <PlaystationIcon size={20} />
            PlayStation trophies
          </h2>
          <p className="game-trophy-meta">
            {progress.platform ? `${progress.platform} · ` : ''}
            {progress.progress}% complete
            {definedTotal > 0 ? ` · ${earnedTotal}/${definedTotal}` : ''}
          </p>
        </div>
      </div>

      <div className="game-trophy-counts">
        {(
          [
            ['platinum', progress.earnedPlatinum, progress.definedPlatinum],
            ['gold', progress.earnedGold, progress.definedGold],
            ['silver', progress.earnedSilver, progress.definedSilver],
            ['bronze', progress.earnedBronze, progress.definedBronze],
          ] as const
        ).map(([type, earned, defined]) => (
          <span key={type} style={{ color: TYPE_COLOR[type] }}>
            {earned}/{defined} {type}
          </span>
        ))}
      </div>

      <div className="game-trophy-progress">
        <div
          className="game-trophy-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress.progress))}%` }}
        />
      </div>

      {trophies.length === 0 ? (
        isOwn ? (
          <SyncGameTrophiesButton gameId={gameId} auto />
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Detailed trophies have not been synced for this title yet.
          </p>
        )
      ) : (
        <ul className="game-trophy-list">
          {trophies.map((t) => (
            <li
              key={t.id}
              className={`game-trophy-row${t.earned ? ' is-earned' : ''}`}
            >
              {t.trophyIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="game-trophy-icon"
                  src={t.trophyIconUrl}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="game-trophy-icon game-trophy-icon-fallback"
                  style={{ background: TYPE_COLOR[t.trophyType] || 'var(--text-muted)' }}
                />
              )}
              <div className="game-trophy-body">
                <div className="game-trophy-name-row">
                  <strong className="game-trophy-name">{t.trophyName}</strong>
                  <span
                    className="game-trophy-type"
                    style={{ color: TYPE_COLOR[t.trophyType] || 'var(--text-muted)' }}
                  >
                    {t.trophyType}
                  </span>
                  {t.earned && t.earnedDateTime && (
                    <span className="game-trophy-date">
                      {new Date(t.earnedDateTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {t.trophyDetail && (
                  <p className="game-trophy-detail">{t.trophyDetail}</p>
                )}
              </div>
              {typeof t.earnedRate === 'number' && !Number.isNaN(t.earnedRate) && (
                <span className="game-trophy-rate">{t.earnedRate.toFixed(1)}%</span>
              )}
            </li>
          ))}
          {earnedCount > 0 && (
            <li className="game-trophy-footer">
              {earnedCount} earned of {trophies.length} listed
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function GameTrophySectionSkeleton() {
  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)', minHeight: 96 }}>
      <div
        className="skeleton"
        style={{ height: 22, width: 180, borderRadius: 6, marginBottom: 12 }}
      />
      <div className="skeleton" style={{ height: 8, width: '100%', borderRadius: 999 }} />
    </div>
  );
}
