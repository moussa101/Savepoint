import { PlaystationIcon, SteamIcon, XboxIcon } from '@/components/ui/Icons';

type PlatformTag = {
  key: string;
  label: string;
  value: string;
  href?: string | null;
  icon: 'steam' | 'xbox' | 'psn';
};

type Props = {
  steamId?: string | null;
  steamPersonaName?: string | null;
  xboxGamertag?: string | null;
  psnOnlineId?: string | null;
};

function PlatformIcon({ kind, size = 18 }: { kind: PlatformTag['icon']; size?: number }) {
  if (kind === 'steam') return <SteamIcon size={size} />;
  if (kind === 'xbox') return <XboxIcon size={size} />;
  return <PlaystationIcon size={size} />;
}

export default function ProfilePlatformTags({
  steamId,
  steamPersonaName,
  xboxGamertag,
  psnOnlineId,
}: Props) {
  const tags: PlatformTag[] = [];

  if (psnOnlineId) {
    tags.push({
      key: 'psn',
      label: 'PlayStation',
      value: psnOnlineId,
      icon: 'psn',
    });
  }
  if (xboxGamertag) {
    tags.push({
      key: 'xbox',
      label: 'Xbox',
      value: xboxGamertag,
      icon: 'xbox',
    });
  }
  if (steamId) {
    tags.push({
      key: 'steam',
      label: 'Steam',
      value: steamPersonaName || 'Linked',
      href: `https://steamcommunity.com/profiles/${steamId}`,
      icon: 'steam',
    });
  }

  if (tags.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
        marginTop: 'var(--space-md)',
      }}
    >
      {tags.map((tag) => {
        const content = (
          <>
            <PlatformIcon kind={tag.icon} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {tag.label}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                }}
              >
                {tag.value}
              </span>
            </span>
          </>
        );

        const style = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-hover)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'inherit',
          textDecoration: 'none',
        } as const;

        return tag.href ? (
          <a
            key={tag.key}
            href={tag.href}
            target="_blank"
            rel="noopener noreferrer"
            style={style}
            title={`${tag.label}: ${tag.value}`}
          >
            {content}
          </a>
        ) : (
          <span key={tag.key} style={style} title={`${tag.label}: ${tag.value}`}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
