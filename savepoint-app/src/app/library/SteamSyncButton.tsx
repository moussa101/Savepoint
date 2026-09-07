'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncSteamLibrary } from '@/app/actions/library-sync';

export default function SteamSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function sync() {
    setStatus(null);
    startTransition(async () => {
      const result = await syncSteamLibrary();
      if ('error' in result && result.error) {
        setStatus({ kind: 'error', text: result.error });
        return;
      }
      const parts: string[] = [];
      if (result.imported) parts.push(`${result.imported} added`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.skipped) parts.push(`${result.skipped} not matched`);
      setStatus({ kind: 'ok', text: parts.length ? `Synced: ${parts.join(', ')}.` : 'Already up to date.' });
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', alignItems: 'flex-end' }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={sync} disabled={pending} aria-busy={pending}>
        {pending ? 'Refreshing…' : 'Refresh'}
      </button>
      {status && (
        <span
          role="status"
          style={{
            fontSize: 'var(--text-xs)',
            color: status.kind === 'error' ? 'var(--error, #f87171)' : 'var(--text-muted)',
            textAlign: 'right',
          }}
        >
          {status.text}
        </span>
      )}
    </div>
  );
}
