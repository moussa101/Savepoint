'use client';

import { useTransition } from 'react';
import { setUserOfficial } from '@/app/actions/admin';

interface Props {
  userId: string;
  isOfficial: boolean;
  username: string;
}

export default function UserVerificationToggles({ userId, isOfficial, username }: Props) {
  const [pending, startTransition] = useTransition();
  const isSavepoint = username.toLowerCase() === 'savepoint';
  const checked = isOfficial || isSavepoint;

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'var(--text-xs)',
        color: checked ? 'var(--accent-primary)' : 'var(--text-muted)',
        fontWeight: checked ? 600 : 400,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={pending || isSavepoint}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            await setUserOfficial(userId, next);
          });
        }}
      />
      {checked ? 'Official' : 'Not official'}
      {isSavepoint ? ' — locked' : ''}
    </label>
  );
}
