'use client';

import { useEffect, useState } from 'react';

type Props = {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

function initialFrom(name?: string | null, username?: string | null) {
  const raw = (name || username || '?').trim();
  return raw.charAt(0).toUpperCase() || '?';
}

/**
 * Profile picture with a letter fallback. OAuth CDN URLs (Google, Discord, …)
 * sometimes 403 / get CSP-blocked — never leave the browser's broken-image icon.
 */
export default function UserAvatar({
  src,
  name,
  username,
  alt,
  className = 'avatar',
  style,
}: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;
  const label = alt ?? name ?? username ?? 'User';

  return (
    <div className={className} style={style}>
      {showImage ? (
        <img
          src={src!}
          alt={label}
          // Google avatars often reject hotlinks that send a Referer.
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initialFrom(name, username)}</span>
      )}
    </div>
  );
}
