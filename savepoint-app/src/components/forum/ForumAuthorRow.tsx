import Link from 'next/link';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

interface Author {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  isVerified?: boolean;
  isOfficial: boolean;
}

export default function ForumAuthorRow({
  author,
  subtitle,
}: {
  author: Author;
  subtitle?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Link href={`/profile/${author.username}`} style={{ textDecoration: 'none' }}>
        <UserAvatar
          className="avatar"
          style={{ width: 32, height: 32, fontSize: '0.9rem' }}
          src={author.image}
          name={author.name}
          username={author.username}
        />
      </Link>
      <div>
        <Link
          href={`/profile/${author.username}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {author.name || author.username}
          <VerifiedBadge isOfficial={author.isOfficial} username={author.username} size={14} />
        </Link>
        {subtitle && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
