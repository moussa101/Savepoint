import Link from 'next/link';
import { GamepadIcon, LockIcon, HeartIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';

interface ListCardProps {
  list: {
    id: string;
    title: string;
    description: string | null;
    visibility: string;
    items: {
      id: string;
      game: {
        coverImage: string | null;
      };
    }[];
    _count: {
      items: number;
    };
    isSpecial?: boolean;
    likesCount?: number;
    user?: {
      name: string | null;
      username: string;
      image: string | null;
    };
  };
  href?: string;
  showAuthor?: boolean;
}

export default function ListCard({ list, href, showAuthor = false }: ListCardProps) {
  const linkHref = href || `/lists/${list.id}`;

  return (
    <Link
      href={linkHref}
      className="card card-interactive"
      style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden', padding: 0 }}
    >
      {/* Cover mosaic */}
      <div style={{
        height: '160px',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(Math.max(list.items.length, 1), 4)}, 1fr)`,
        gap: '1px',
        background: 'var(--bg-surface-hover)',
        position: 'relative',
      }}>
        {list.items.slice(0, 4).map((item) => (
          <div key={item.id} style={{ overflow: 'hidden', height: '100%' }}>
            {item.game.coverImage ? (
              <img src={item.game.coverImage} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)' }} />
            )}
          </div>
        ))}
        {list.items.length === 0 && (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)' }} />
        )}
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(13, 13, 26, 1) 0%, rgba(13, 13, 26, 0) 100%)',
          zIndex: 1,
        }} />
        {/* Content positioned over mosaic */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--space-lg)', zIndex: 2 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {list.isSpecial && <HeartIcon size={20} filled color="var(--accent-primary)" />}
            {list.title}
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><GamepadIcon size={14} /> {list._count.items} games</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {list.visibility === 'PUBLIC' ? 'Public' : <><LockIcon size={12} /> Private</>}
            </span>
            {list.likesCount !== undefined && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HeartIcon size={14} filled color="var(--accent-primary)" /> {list.likesCount}
              </span>
            )}
          </div>
        </div>
      </div>
      {(list.description || showAuthor) && (
        <div style={{ padding: 'var(--space-lg)' }}>
          {showAuthor && list.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: list.description ? '12px' : 0 }}>
              <UserAvatar
                className="avatar"
                style={{ width: '24px', height: '24px', fontSize: '10px' }}
                src={list.user.image}
                name={list.user.name}
                username={list.user.username}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                By <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{list.user.name || list.user.username}</span>
              </span>
            </div>
          )}
          {list.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
              {list.description}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
