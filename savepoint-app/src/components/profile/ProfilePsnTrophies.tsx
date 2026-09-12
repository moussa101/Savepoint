import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PlaystationIcon } from '@/components/ui/Icons';

const TYPE_COLOR: Record<string, string> = {
  platinum: '#E5E4E2',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

type Props = {
  userId: string;
  isOwnProfile: boolean;
};

export default async function ProfilePsnTrophies({ userId, isOwnProfile }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      psnOnlineId: true,
      psnTrophyLevel: true,
      psnTrophyTier: true,
      psnTrophyProgress: true,
      psnEarnedBronze: true,
      psnEarnedSilver: true,
      psnEarnedGold: true,
      psnEarnedPlatinum: true,
      psnLastSyncAt: true,
    },
  });

  if (!user?.psnOnlineId) {
    return null;
  }

  const titles = await prisma.psnTitleProgress.findMany({
    where: { userId },
    orderBy: [{ lastUpdatedAt: 'desc' }, { progress: 'desc' }],
    take: 48,
    include: {
      game: { select: { slug: true, coverImage: true, name: true } },
    },
  });

  // Prefer stored profile totals; if they look empty, sum from title rows.
  let earnedBronze = user.psnEarnedBronze;
  let earnedSilver = user.psnEarnedSilver;
  let earnedGold = user.psnEarnedGold;
  let earnedPlatinum = user.psnEarnedPlatinum;
  if (earnedBronze + earnedSilver + earnedGold + earnedPlatinum === 0 && titles.length > 0) {
    earnedBronze = titles.reduce((s, t) => s + t.earnedBronze, 0);
    earnedSilver = titles.reduce((s, t) => s + t.earnedSilver, 0);
    earnedGold = titles.reduce((s, t) => s + t.earnedGold, 0);
    earnedPlatinum = titles.reduce((s, t) => s + t.earnedPlatinum, 0);
  }

  const totalEarned = earnedBronze + earnedSilver + earnedGold + earnedPlatinum;
  const titleCount = await prisma.psnTitleProgress.count({ where: { userId } });

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <h2
        className="section-title font-display"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <PlaystationIcon size={22} />
        PlayStation trophies
      </h2>

      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-lg)',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>PSN ID</div>
          <strong>{user.psnOnlineId}</strong>
        </div>
        {user.psnTrophyLevel != null && (
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Trophy level</div>
            <strong>
              {user.psnTrophyLevel}
              {user.psnTrophyProgress != null ? ` · ${user.psnTrophyProgress}%` : ''}
            </strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
          <span style={{ color: TYPE_COLOR.platinum }}>{earnedPlatinum} platinum</span>
          <span style={{ color: TYPE_COLOR.gold }}>{earnedGold} gold</span>
          <span style={{ color: TYPE_COLOR.silver }}>{earnedSilver} silver</span>
          <span style={{ color: TYPE_COLOR.bronze }}>{earnedBronze} bronze</span>
        </div>
        {totalEarned > 0 && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {totalEarned.toLocaleString()} trophies earned
            {titleCount > 0 ? ` · ${titleCount} titles` : ''}
          </div>
        )}
        {isOwnProfile && titleCount <= 2 && (
          <p style={{ width: '100%', margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Sony’s trophy list for this account currently shows {titleCount || 'few'} title
            {titleCount === 1 ? '' : 's'}
            {totalEarned === 0 ? ' and 0 earned trophies' : ''}. Library games come from your purchased /
            recently played catalog — run <strong>Sync library &amp; trophies</strong> again if games are missing.
            If you expect more trophies, check you’re signed into the right PSN account and that trophies have synced online.
          </p>
        )}
      </div>

      {titles.length > 0 && (
        <div className="psn-title-grid">
          {titles.map((title) => {
            const imageSrc = title.game?.coverImage || title.iconUrl || '';
            const inner = (
              <>
                <div className="psn-title-row">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="psn-title-cover"
                      src={imageSrc}
                      alt=""
                      width={36}
                      height={48}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="psn-title-cover psn-title-cover-fallback" />
                  )}
                  <div className="psn-title-info">
                    <div className="psn-title-name">{title.game?.name || title.titleName}</div>
                    <div className="psn-title-meta">
                      {title.platform || 'PSN'} · {title.progress}%
                    </div>
                  </div>
                </div>
                <div className="psn-title-progress">
                  <div
                    className="psn-title-progress-fill"
                    style={{ width: `${Math.min(100, title.progress)}%` }}
                  />
                </div>
                <div className="psn-title-counts">
                  <span style={{ color: TYPE_COLOR.platinum }}>{title.earnedPlatinum}P</span>
                  {' · '}
                  <span style={{ color: TYPE_COLOR.gold }}>{title.earnedGold}G</span>
                  {' · '}
                  <span style={{ color: TYPE_COLOR.silver }}>{title.earnedSilver}S</span>
                  {' · '}
                  <span style={{ color: TYPE_COLOR.bronze }}>{title.earnedBronze}B</span>
                </div>
              </>
            );

            return title.game?.slug ? (
              <Link key={title.id} href={`/games/${title.game.slug}`} className="card psn-title-card">
                {inner}
              </Link>
            ) : (
              <div key={title.id} className="card psn-title-card">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
