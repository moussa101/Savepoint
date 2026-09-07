import Link from 'next/link';
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
  showConnectHint?: boolean;
};

export default async function GameTrophySection({
  gameId,
  userId: forcedUserId,
  showConnectHint = true,
}: Props) {
  const session = await auth();
  const userId = forcedUserId || session?.user?.id;
  if (!userId) {
    if (!showConnectHint) return null;
    return null;
  }

  const [progress, viewer] = await Promise.all([
    prisma.psnTitleProgress.findFirst({
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
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { psnOnlineId: true },
    }),
  ]);

  if (!progress) {
    if (!showConnectHint || forcedUserId) return null;
    if (!viewer?.psnOnlineId) {
      return (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <h2
            className="font-display"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              marginBottom: 'var(--space-sm)',
            }}
          >
            <PlaystationIcon size={22} />
            PlayStation trophies
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Connect PlayStation in{' '}
            <Link href="/settings" style={{ color: 'var(--accent-primary)' }}>
              Settings
            </Link>{' '}
            — Library auto-syncs trophies after you connect.
          </p>
        </div>
      );
    }
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
    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div>
          <h2
            className="font-display"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            <PlaystationIcon size={22} />
            PlayStation trophies
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {progress.platform ? `${progress.platform} · ` : ''}
            {progress.progress}% complete
            {definedTotal > 0 ? ` · ${earnedTotal}/${definedTotal}` : ''}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-md)',
          fontSize: 'var(--text-sm)',
        }}
      >
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

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: 'var(--bg-surface-hover)',
          overflow: 'hidden',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, progress.progress))}%`,
            height: '100%',
            background: 'var(--accent-primary)',
          }}
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
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          {trophies.map((t) => (
            <li
              key={t.id}
              style={{
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'flex-start',
                opacity: t.earned ? 1 : 0.55,
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-hover)',
              }}
            >
              {t.trophyIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.trophyIconUrl}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  style={{ borderRadius: 6, flexShrink: 0, objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    background: TYPE_COLOR[t.trophyType] || 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{t.trophyName}</strong>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: TYPE_COLOR[t.trophyType] || 'var(--text-muted)',
                    }}
                  >
                    {t.trophyType}
                  </span>
                  {t.earned && t.earnedDateTime && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(t.earnedDateTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {t.trophyDetail && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {t.trophyDetail}
                  </p>
                )}
              </div>
              {typeof t.earnedRate === 'number' && !Number.isNaN(t.earnedRate) && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {t.earnedRate.toFixed(1)}%
                </span>
              )}
            </li>
          ))}
          {earnedCount > 0 && (
            <li style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', paddingTop: 4 }}>
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
