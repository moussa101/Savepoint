'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { linkPsnNpsso, syncPsnLibrary, unlinkPsn } from '@/app/actions/library-sync';
import { PlaystationIcon } from '@/components/ui/Icons';

const SONY_NPSSO_URL = 'https://ca.account.sony.com/api/v1/ssocookie';

type Props = {
  psnOnlineId: string | null;
  psnLastSyncAt: Date | string | null;
  /** When true, kick off a background library sync on mount (non-blocking). */
  autoSync?: boolean;
};

function formatWhen(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function openSonyTokenPage() {
  window.open(SONY_NPSSO_URL, 'savepoint-psn-npsso', 'noopener,noreferrer');
}

export default function PsnLibraryCard({
  psnOnlineId,
  psnLastSyncAt,
  autoSync = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [psnInput, setPsnInput] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const autoStarted = useRef(false);

  function run(
    action: () => Promise<{
      error?: string;
      success?: boolean;
      imported?: number;
      updated?: number;
      skipped?: number;
      warning?: string;
      onlineId?: string;
      trophyTitles?: number;
      xpGained?: number;
      needsSync?: boolean;
    }>,
    opts?: { quiet?: boolean }
  ) {
    if (!opts?.quiet) setStatus(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setStatus({ kind: 'error', text: result.error });
          return;
        }
        if (result?.success) {
          const parts: string[] = [];
          if (result.onlineId) parts.push(`Linked as ${result.onlineId}`);
          if (typeof result.imported === 'number') parts.push(`${result.imported} added`);
          if (typeof result.updated === 'number') parts.push(`${result.updated} updated`);
          if (typeof result.skipped === 'number' && result.skipped > 0) {
            parts.push(`${result.skipped} not matched`);
          }
          if (typeof result.trophyTitles === 'number' && result.trophyTitles > 0) {
            parts.push(`${result.trophyTitles} trophy titles`);
          }
          if (typeof result.xpGained === 'number' && result.xpGained > 0) {
            parts.push(`+${result.xpGained} XP`);
          }
          // After a fast link, kick off library sync in the same transition.
          if (result.needsSync && !opts?.quiet) {
            setStatus({
              kind: 'ok',
              text: result.onlineId
                ? `Linked as ${result.onlineId}. Syncing library…`
                : 'Linked. Syncing library…',
            });
            const syncResult = await syncPsnLibrary();
            if (syncResult?.error) {
              setStatus({ kind: 'error', text: syncResult.error });
              router.refresh();
              return;
            }
            const syncParts: string[] = [];
            if (typeof syncResult.imported === 'number') syncParts.push(`${syncResult.imported} added`);
            if (typeof syncResult.updated === 'number') syncParts.push(`${syncResult.updated} updated`);
            if (typeof syncResult.xpGained === 'number' && syncResult.xpGained > 0) {
              syncParts.push(`+${syncResult.xpGained} XP`);
            }
            const syncBase = syncParts.length ? syncParts.join(', ') + '.' : 'Library synced.';
            setStatus({
              kind: 'ok',
              text: syncResult.warning ? `${syncBase} ${syncResult.warning}` : syncBase,
            });
            setPsnInput('');
            router.refresh();
            return;
          }
          const base = parts.length
            ? (opts?.quiet ? `Auto-synced (${parts.join(', ')})` : parts.join(', ')) + '.'
            : opts?.quiet
              ? 'PlayStation library is up to date.'
              : 'Done.';
          setStatus({
            kind: 'ok',
            text: result.warning ? `${base} ${result.warning}` : base,
          });
          setPsnInput('');
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
    if (!autoSync || !psnOnlineId || autoStarted.current || pending) return;
    autoStarted.current = true;
    setStatus({ kind: 'ok', text: 'Auto-syncing PlayStation library in the background…' });
    run(syncPsnLibrary, { quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when Library says sync is due
  }, [autoSync, psnOnlineId]);

  return (
    <div
      className="card"
      style={{
        marginBottom: 'var(--space-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
          <PlaystationIcon size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>PlayStation library</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {psnOnlineId
                ? `${psnOnlineId}${
                    pending
                      ? ' · Syncing library & trophies…'
                      : psnLastSyncAt
                        ? ` · Auto-syncs when you open Library (last sync ${formatWhen(psnLastSyncAt)})`
                        : ' · Connected — sync will start automatically'
                  }`
                : 'Connect PlayStation to import playtime and trophies. Library syncs automatically after connecting.'}
            </div>
          </div>
        </div>

        {psnOnlineId ? (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => run(syncPsnLibrary)}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? 'Syncing…' : 'Sync library & trophies'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => run(unlinkPsn)}
              disabled={pending}
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>

      {!psnOnlineId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <ol
            style={{
              margin: 0,
              paddingLeft: '1.2rem',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <li>Sign in to your PlayStation account (we’ll open Sony’s page for you).</li>
            <li>
              Copy the <code>npsso</code> value from the JSON (looks like a long string).
            </li>
            <li>Paste it below and connect. We never store the NPSSO — only an encrypted refresh token.</li>
          </ol>
          <div>
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={openSonyTokenPage}>
              Open Sony token page
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => {
                const fd = new FormData();
                fd.set('npsso', psnInput);
                return linkPsnNpsso(fd);
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxWidth: 480 }}
          >
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder="Paste npsso token from the Sony tab"
              value={psnInput}
              onChange={(e) => setPsnInput(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={pending || !psnInput.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              {pending ? 'Linking…' : 'Connect PlayStation'}
            </button>
          </form>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Unofficial PSN access (no public OAuth from Sony). Treat the token like a password.
          </p>
        </div>
      )}

      {status && (
        <span
          role="status"
          style={{
            fontSize: 'var(--text-xs)',
            color: status.kind === 'error' ? 'var(--error, #f87171)' : 'var(--text-muted)',
          }}
        >
          {status.text}
        </span>
      )}
    </div>
  );
}
