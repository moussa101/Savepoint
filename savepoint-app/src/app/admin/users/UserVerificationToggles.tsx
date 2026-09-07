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

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
      <input
        type="checkbox"
        checked={isOfficial || isSavepoint}
        disabled={pending || isSavepoint}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            await setUserOfficial(userId, next);
          });
        }}
      />
      Official (green)
      {isSavepoint ? ' — locked' : ''}
    </label>
  );
}
