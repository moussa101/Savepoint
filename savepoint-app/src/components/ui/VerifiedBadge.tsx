'use client';

interface VerifiedBadgeProps {
  isOfficial?: boolean;
  /** @deprecated Blue verified badges removed — ignored */
  isVerified?: boolean;
  username?: string | null;
  size?: number;
  className?: string;
}

/** Green official badge for the Savepoint account. */
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
        justifyContent: 'center',
        verticalAlign: 'middle',
        lineHeight: 0,
        flexShrink: 0,
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <circle cx="12" cy="12" r="11" fill="#22c55e" />
        <path
          d="M7.2 12.2l3.1 3.1 6.5-6.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
