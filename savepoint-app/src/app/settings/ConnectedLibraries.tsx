'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  linkPsnNpsso,
  linkXboxGamertag,
  syncPsnLibrary,
  syncSteamLibrary,
  syncXboxLibrary,
  unlinkPsn,
  unlinkSteam,
  unlinkXbox,
} from '@/app/actions/library-sync';
import { PlaystationIcon, SteamIcon, XboxIcon } from '@/components/ui/Icons';

type Props = {
  steamId: string | null;
  steamPersonaName?: string | null;
  steamLinkedAt: Date | string | null;
  steamLastSyncAt: Date | string | null;
  xboxGamertag: string | null;
  xboxLinkedAt: Date | string | null;
  xboxLastSyncAt: Date | string | null;
  psnOnlineId: string | null;
  psnLinkedAt: Date | string | null;
  psnLastSyncAt: Date | string | null;
  steamQuery?: string | null;
  /** Xbox (OpenXBL) is opt-in until that integration is finished. */
  showXbox?: boolean;
};

function formatWhen(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

export default function ConnectedLibraries({
  steamId,
  steamPersonaName,
  steamLinkedAt,
  steamLastSyncAt,
  xboxGamertag,
  xboxLinkedAt,
  xboxLastSyncAt,
  psnOnlineId,
  psnLinkedAt,
  psnLastSyncAt,
  steamQuery,
  showXbox = false,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<'steam' | 'psn' | 'xbox' | null>(null);
  const [xboxInput, setXboxInput] = useState(xboxGamertag || '');
  const [psnInput, setPsnInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const steamBusy = busy === 'steam';
  const psnBusy = busy === 'psn';
  const xboxBusy = busy === 'xbox';
  const anyBusy = busy !== null;

  const steamBanner =
    steamQuery === 'linked'
      ? 'Steam connected successfully.'
      : steamQuery === 'cancelled'
        ? 'Steam connection cancelled.'
        : steamQuery === 'taken'
          ? 'That Steam account is already linked to another user.'
          : steamQuery === 'invalid' || steamQuery === 'error'
            ? 'Steam connection failed. Try again.'
            : '';

  function run(
    platform: 'steam' | 'psn' | 'xbox',
    action: () => Promise<{
      error?: string;
      success?: boolean;
      imported?: number;
      updated?: number;
      skipped?: number;
      warning?: string;
      onlineId?: string;
      xpGained?: number;
      needsSync?: boolean;
      trophyTitles?: number;
    }>
  ) {
    setMessage('');
    setError('');
    setBusy(platform);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.success) {
          let syncExtra = result;
          if (platform === 'psn' && result.needsSync) {
            setMessage(
              result.onlineId
                ? `Linked as ${result.onlineId}. Syncing library in the background…`
                : 'Linked. Syncing library in the background…'
            );
            syncExtra = await syncPsnLibrary();
          }
          const parts = [];
          if (result.onlineId) parts.push(`Linked as ${result.onlineId}`);
          if (typeof syncExtra.imported === 'number') parts.push(`${syncExtra.imported} new`);
          if (typeof syncExtra.updated === 'number') parts.push(`${syncExtra.updated} updated`);
          if (typeof syncExtra.skipped === 'number' && syncExtra.skipped > 0) {
            parts.push(`${syncExtra.skipped} not matched`);
          }
          if (typeof syncExtra.xpGained === 'number' && syncExtra.xpGained > 0) {
            parts.push(`+${syncExtra.xpGained} XP`);
          }
          const base = parts.length ? parts.join(', ') + '.' : 'Connected successfully.';
          const warning = 'warning' in syncExtra ? syncExtra.warning : result.warning;
          if (syncExtra.error) {
            setError(syncExtra.error);
          } else {
            setMessage(warning ? `${base} ${warning}` : base);
          }
          setPsnInput('');
          router.refresh();
          return;
        }
        setError('Something went wrong. Please try again.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="card">
      <h2
        className="font-display"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          marginBottom: 'var(--space-sm)',
        }}
      >
        Connected libraries
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
        Link Steam, PlayStation, or Xbox to the same Savepoint account you already use.
        Connecting a library never creates a new Savepoint account. Manual ratings and statuses are never overwritten.
      </p>

      {(steamBanner || message) && (
        <div className="auth-success" style={{ marginBottom: 'var(--space-md)' }}>
          {message || steamBanner}
        </div>
      )}
      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>
          {error}
        </div>
      )}

      {/* Steam */}
      <div
        style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-hover)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <SteamIcon size={22} />
          <strong>Steam</strong>
        </div>
        {steamId ? (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              {steamPersonaName ? (
                <>
                  <strong style={{ color: 'var(--text-primary)' }}>{steamPersonaName}</strong>
                  {steamLinkedAt ? ` · linked ${formatWhen(steamLinkedAt)}` : ''}
                </>
              ) : (
                <>Linked{steamLinkedAt ? ` · ${formatWhen(steamLinkedAt)}` : ''}</>
              )}
              {steamLastSyncAt
                ? ` · Last sync ${formatWhen(steamLastSyncAt)} · Auto-syncs when you open Library`
                : ' · Library auto-syncs when you open it'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={anyBusy}
                onClick={() => run('steam', syncSteamLibrary)}
              >
                {steamBusy ? 'Working…' : 'Refresh now'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={anyBusy}
                onClick={() => run('steam', unlinkSteam)}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <a href="/api/auth/steam?mode=link&return=settings" className="btn btn-primary">
              Connect Steam
            </a>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
              Approves the link on Steam — we never see your Steam password. Your Steam profile
              and “Game details” must be Public for library import. After linking you can also use
              “Continue with Steam” on the login page.
            </p>
          </>
        )}
      </div>

      {/* PlayStation */}
      <div
        style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-hover)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <PlaystationIcon size={22} />
          <strong>PlayStation</strong>
        </div>
        {psnOnlineId ? (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              {psnOnlineId}
              {psnLinkedAt ? ` · Linked ${formatWhen(psnLinkedAt)}` : ''}
              {psnLastSyncAt ? ` · Last sync ${formatWhen(psnLastSyncAt)}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={anyBusy}
                onClick={() => run('psn', syncPsnLibrary)}
              >
                {psnBusy ? 'Working…' : 'Sync library & trophies'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={anyBusy}
                onClick={() => run('psn', unlinkPsn)}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
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
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={anyBusy}
                onClick={() => {
                  // Opens Sony SSO cookie endpoint. If not signed in, Sony sends them through login first.
                  window.open(
                    'https://ca.account.sony.com/api/v1/ssocookie',
                    'savepoint-psn-npsso',
                    'noopener,noreferrer'
                  );
                }}
              >
                Open Sony token page
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run('psn', () => {
                  const fd = new FormData();
                  fd.set('npsso', psnInput);
                  return linkPsnNpsso(fd);
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
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
              <button type="submit" className="btn btn-primary" disabled={anyBusy || !psnInput.trim()} style={{ alignSelf: 'flex-start' }}>
                {psnBusy ? 'Linking…' : 'Connect PlayStation'}
              </button>
            </form>
          </div>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          Unofficial PSN access (no public OAuth from Sony). Treat the token like a password. It expires —
          reconnect with a fresh one if sync stops working.
        </p>
      </div>

      {/* Xbox */}
      {showXbox && (
      <div
        style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-hover)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <XboxIcon size={22} />
          <strong>Xbox</strong>
        </div>
        {xboxGamertag ? (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              {xboxGamertag}
              {xboxLinkedAt ? ` · Linked ${formatWhen(xboxLinkedAt)}` : ''}
              {xboxLastSyncAt ? ` · Last sync ${formatWhen(xboxLastSyncAt)}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={anyBusy}
                onClick={() => run('xbox', syncXboxLibrary)}
              >
                {xboxBusy ? 'Working…' : 'Sync library'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={anyBusy}
                onClick={() => run('xbox', unlinkXbox)}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run('xbox', () => linkXboxGamertag(xboxInput));
            }}
            style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              className="input"
              placeholder="Gamertag (include #suffix if any)"
              value={xboxInput}
              onChange={(e) => setXboxInput(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={anyBusy}>
              {xboxBusy ? 'Linking…' : 'Connect Xbox'}
            </button>
          </form>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          Uses OpenXBL for title history. Separate from “Continue with Xbox” login.
        </p>
      </div>
      )}
    </div>
  );
}
