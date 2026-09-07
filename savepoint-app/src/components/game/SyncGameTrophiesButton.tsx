'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncPsnTrophiesForGame } from '@/app/actions/library-sync';

type Props = {
  gameId: string;
  /** When true, fetch trophy details as soon as this mounts. */
  auto?: boolean;
};

export default function SyncGameTrophiesButton({ gameId, auto = true }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  function load() {
    setError(null);
    startTransition(async () => {
      const result = await syncPsnTrophiesForGame(gameId);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto load per mount/gameId
  }, [auto, gameId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pending ? (
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Fetching trophy list from PlayStation…
        </p>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--error, #f87171)' }}>{error}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      ) : !auto ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>
          Load trophies
        </button>
      ) : null}
    </div>
  );
}
