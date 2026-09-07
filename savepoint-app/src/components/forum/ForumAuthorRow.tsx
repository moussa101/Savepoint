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
  size = 40,
}: {
  author: Author;
  subtitle?: string;
  size?: number;
}) {
  const displayName = author.name?.trim() || author.username;

  return (
    <div className="forum-author-row">
      <Link href={`/profile/${author.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <UserAvatar
          className="avatar"
          style={{ width: size, height: size, fontSize: size > 36 ? '1rem' : '0.85rem' }}
          src={author.image}
          name={author.name}
          username={author.username}
        />
      </Link>
      <div className="forum-author-meta">
        <Link href={`/profile/${author.username}`} className="forum-author-name">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <VerifiedBadge isOfficial={author.isOfficial} username={author.username} size={14} />
        </Link>
        <div className="forum-author-handle">
          @{author.username}
          {subtitle ? ` · ${subtitle}` : ''}
        </div>
      </div>
    </div>
  );
}
