'use client';

interface VerifiedBadgeProps {
  isOfficial?: boolean;
  /** @deprecated Blue verified badges removed — ignored */
  isVerified?: boolean;
  username?: string | null;
  size?: number;
  className?: string;
}

/** Green official badge for the Savepoint account only. */
export default function VerifiedBadge({
  isOfficial = false,
  username,
  size = 16,
  className,
}: VerifiedBadgeProps) {
  const show =
    isOfficial || (typeof username === 'string' && username.toLowerCase() === 'savepoint');
  if (!show) return null;

  return (
    <span
      className={className}
      title="Official Savepoint account"
      aria-label="Official Savepoint account"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="#22c55e"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <path d="M12 2l2.09 1.09L16.5 2.5l.91 2.09L19.5 5.5l-.09 2.25L21.5 9.5l-1.5 1.75.09 2.25-2.09.91-.91 2.09-2.41-.59L12 17.5l-2.18 1.41-.91-2.09-2.09-.91.09-2.25L5 11.25 3.5 9.5l2.09-1.75L5.5 5.5l2.09-.91L8.5 2.5l2.41.59L12 2z" />
        <path
          d="M10.2 12.6l-1.7-1.7-1.1 1.1 2.8 2.8 5.2-5.2-1.1-1.1-4.1 4.1z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}
