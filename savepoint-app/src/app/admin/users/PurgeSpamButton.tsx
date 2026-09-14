'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { purgeRecentSpamSignups } from '@/app/actions/admin';

export default function PurgeSpamButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              'Ban empty spam-looking accounts from the last 7 days (no reviews/lists)? This cannot be undone from this button.'
            )
          ) {
            return;
          }
          setMessage(null);
          startTransition(async () => {
            const result = await purgeRecentSpamSignups(7);
            if (result.error) {
              setMessage(result.error);
              return;
            }
            setMessage(`Banned ${result.banned} spam account(s).`);
            router.refresh();
          });
        }}
      >
        {pending ? 'Purging…' : 'Purge spam signups (7d)'}
      </button>
      {message ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{message}</span>
      ) : null}
    </div>
  );
}
