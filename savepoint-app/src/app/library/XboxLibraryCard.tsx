'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { linkXboxGamertag, syncXboxLibrary, unlinkXbox } from '@/app/actions/library-sync';
import { XboxIcon } from '@/components/ui/Icons';
import PlatformConnectionCard from '@/components/ui/PlatformConnectionCard';

type Props = {
  xboxGamertag: string | null;
  xboxLastSyncAt: Date | string | null;
  autoSync?: boolean;
};

function formatWhen(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

export default function XboxLibraryCard({
  xboxGamertag,
  xboxLastSyncAt,
  autoSync = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [xboxInput, setXboxInput] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const autoStarted = useRef(false);

  function run(
    action: () => Promise<{
      error?: string;
      success?: boolean;
      imported?: number;
      updated?: number;
      skipped?: number;
      gamertag?: string;
      xpGained?: number;
      needsSync?: boolean;
    }>,
    opts?: { quiet?: boolean }
  ) {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setStatus({ kind: 'error', text: result.error });
          return;
        }
        if (result?.success) {
          if (result.needsSync && !opts?.quiet) {
            setStatus({
              kind: 'ok',
              text: result.gamertag
                ? `Linked as ${result.gamertag}. Syncing library…`
                : 'Linked. Syncing library…',
            });
            const syncResult = await syncXboxLibrary();
            if (syncResult?.error) {
              setStatus({ kind: 'error', text: syncResult.error });
              router.refresh();
              return;
            }
            const syncParts: string[] = [];
            if (typeof syncResult.imported === 'number') syncParts.push(`${syncResult.imported} added`);
            if (typeof syncResult.updated === 'number') syncParts.push(`${syncResult.updated} updated`);
            if (typeof syncResult.skipped === 'number' && syncResult.skipped > 0) {
              syncParts.push(`${syncResult.skipped} unmatched`);
            }
            if (typeof syncResult.xpGained === 'number' && syncResult.xpGained > 0) {
              syncParts.push(`+${syncResult.xpGained} XP`);
            }
            setStatus({
              kind: 'ok',
              text: syncParts.length ? syncParts.join(', ') + '.' : 'Library synced.',
            });
            setXboxInput('');
            router.refresh();
            return;
          }

          const parts: string[] = [];
          if (typeof result.imported === 'number') parts.push(`${result.imported} added`);
          if (typeof result.updated === 'number') parts.push(`${result.updated} updated`);
          if (typeof result.skipped === 'number' && result.skipped > 0) {
            parts.push(`${result.skipped} unmatched`);
          }
          if (typeof result.xpGained === 'number' && result.xpGained > 0) {
            parts.push(`+${result.xpGained} XP`);
          }
          setStatus({
            kind: 'ok',
            text: parts.length
              ? (opts?.quiet ? `Auto-synced (${parts.join(', ')})` : parts.join(', ')) + '.'
              : opts?.quiet
                ? 'Xbox library is up to date.'
                : 'Done.',
          });
          setXboxInput('');
          router.refresh();
          return;
        }
        setStatus({ kind: 'error', text: 'Something went wrong. Please try again.' });
      } catch (err) {
        setStatus({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        });
      }
    });
  }

  useEffect(() => {
    if (!autoSync || !xboxGamertag || autoStarted.current || pending) return;
    autoStarted.current = true;
    setStatus({ kind: 'ok', text: 'Auto-syncing Xbox library in the background…' });
    run(syncXboxLibrary, { quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, xboxGamertag]);

  return (
    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
      <PlatformConnectionCard
        icon={<XboxIcon size={28} />}
        title="Xbox library"
        meta={
          xboxGamertag
            ? `${xboxGamertag}${xboxLastSyncAt ? ` · Last sync ${formatWhen(xboxLastSyncAt)}` : ''}`
            : 'Link your gamertag to import Xbox title history via OpenXBL.'
        }
        actions={
          xboxGamertag ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() => run(syncXboxLibrary)}
              >
                {pending ? 'Working…' : 'Sync now'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pending}
                onClick={() => run(unlinkXbox)}
              >
                Disconnect
              </button>
            </>
          ) : null
        }
        status={status}
        hint='Uses OpenXBL for title history. Separate from “Continue with Xbox” login.'
      >
        {!xboxGamertag ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => linkXboxGamertag(xboxInput));
            }}
            className="platform-connect-actions"
          >
            <label className="sr-only" htmlFor="library-xbox-gt">
              Xbox gamertag
            </label>
            <input
              id="library-xbox-gt"
              className="input"
              placeholder="Gamertag (include #suffix if any)"
              value={xboxInput}
              onChange={(e) => setXboxInput(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
              required
              disabled={pending}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={pending || !xboxInput.trim()}
            >
              {pending ? 'Linking…' : 'Connect Xbox'}
            </button>
          </form>
        ) : null}
      </PlatformConnectionCard>
    </div>
  );
}
