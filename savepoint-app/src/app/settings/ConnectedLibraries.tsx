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
import PlatformConnectionCard from '@/components/ui/PlatformConnectionCard';

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
  showXbox = true,
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
      gamertag?: string;
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
          if ((platform === 'psn' || platform === 'xbox') && result.needsSync) {
            const label =
              platform === 'xbox'
                ? result.gamertag || 'Xbox'
                : result.onlineId || 'PlayStation';
            setMessage(`Linked as ${label}. Syncing library in the background…`);
            syncExtra =
              platform === 'xbox' ? await syncXboxLibrary() : await syncPsnLibrary();
          }
          const parts = [];
          if (result.onlineId) parts.push(`Linked as ${result.onlineId}`);
          if (result.gamertag && platform === 'xbox') parts.push(`Linked as ${result.gamertag}`);
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
          setXboxInput('');
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
      <h2 className="section-title" style={{ marginBottom: 'var(--space-sm)' }}>
        Connected libraries
      </h2>
      <p className="page-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
        Link Steam, PlayStation, or Xbox to the same Savepoint account you already use.
        Connecting a library never creates a new Savepoint account. Manual ratings and statuses are never overwritten.
      </p>

      {(steamBanner || message) && (
        <div className="auth-success" style={{ marginBottom: 'var(--space-md)' }} role="status">
          {message || steamBanner}
        </div>
      )}
      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }} role="alert">
          {error}
        </div>
      )}

      <PlatformConnectionCard
        icon={<SteamIcon size={22} />}
        title="Steam"
        meta={
          steamId
            ? `${steamPersonaName || 'Linked'}${steamLinkedAt ? ` · Linked ${formatWhen(steamLinkedAt)}` : ''}${
                steamLastSyncAt
                  ? ` · Last sync ${formatWhen(steamLastSyncAt)} · Auto-syncs when you open Library`
                  : ' · Library auto-syncs when you open it'
              }`
            : null
        }
        actions={
          steamId ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={anyBusy}
                onClick={() => run('steam', syncSteamLibrary)}
              >
                {steamBusy ? 'Working…' : 'Refresh now'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={anyBusy}
                onClick={() => run('steam', unlinkSteam)}
              >
                Disconnect
              </button>
            </>
          ) : (
            <a href="/api/auth/steam?mode=link&return=settings" className="btn btn-primary btn-sm">
              Connect Steam
            </a>
          )
        }
        hint={
          steamId
            ? null
            : 'Approves the link on Steam — we never see your Steam password. Profile and “Game details” must be Public for import.'
        }
      />

      <PlatformConnectionCard
        icon={<PlaystationIcon size={22} />}
        title="PlayStation"
        meta={
          psnOnlineId
            ? `${psnOnlineId}${psnLinkedAt ? ` · Linked ${formatWhen(psnLinkedAt)}` : ''}${
                psnLastSyncAt ? ` · Last sync ${formatWhen(psnLastSyncAt)}` : ''
              }`
            : null
        }
        actions={
          psnOnlineId ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={anyBusy}
                onClick={() => run('psn', syncPsnLibrary)}
              >
                {psnBusy ? 'Working…' : 'Sync library & trophies'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={anyBusy}
                onClick={() => run('psn', unlinkPsn)}
              >
                Disconnect
              </button>
            </>
          ) : null
        }
        hint="Unofficial PSN access. Treat the token like a password — reconnect with a fresh one if sync stops working."
      >
        {!psnOnlineId ? (
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
                Copy the <code>npsso</code> value from the JSON.
              </li>
              <li>Paste it below and connect.</li>
            </ol>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={anyBusy}
              onClick={() => {
                window.open(
                  'https://ca.account.sony.com/api/v1/ssocookie',
                  'savepoint-psn-npsso',
                  'noopener,noreferrer'
                );
              }}
            >
              Open Sony token page
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run('psn', () => {
                  const fd = new FormData();
                  fd.set('npsso', psnInput);
                  return linkPsnNpsso(fd);
                });
              }}
              className="platform-connect-actions"
              style={{ width: '100%' }}
            >
              <label className="sr-only" htmlFor="settings-psn-npsso">
                NPSSO token
              </label>
              <input
                id="settings-psn-npsso"
                className="input"
                type="password"
                autoComplete="off"
                placeholder="Paste npsso token"
                value={psnInput}
                onChange={(e) => setPsnInput(e.target.value)}
                required
                style={{ flex: 1, minWidth: 160 }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={anyBusy || !psnInput.trim()}
              >
                {psnBusy ? 'Linking…' : 'Connect PlayStation'}
              </button>
            </form>
          </div>
        ) : null}
      </PlatformConnectionCard>

      {showXbox && (
        <PlatformConnectionCard
          icon={<XboxIcon size={22} />}
          title="Xbox"
          meta={
            xboxGamertag
              ? `${xboxGamertag}${xboxLinkedAt ? ` · Linked ${formatWhen(xboxLinkedAt)}` : ''}${
                  xboxLastSyncAt ? ` · Last sync ${formatWhen(xboxLastSyncAt)}` : ''
                }`
              : null
          }
          actions={
            xboxGamertag ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={anyBusy}
                  onClick={() => run('xbox', syncXboxLibrary)}
                >
                  {xboxBusy ? 'Working…' : 'Sync library'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={anyBusy}
                  onClick={() => run('xbox', unlinkXbox)}
                >
                  Disconnect
                </button>
              </>
            ) : null
          }
          hint='Uses OpenXBL for title history. Separate from “Continue with Xbox” login.'
        >
          {!xboxGamertag ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run('xbox', () => linkXboxGamertag(xboxInput));
              }}
              className="platform-connect-actions"
            >
              <label className="sr-only" htmlFor="settings-xbox-gt">
                Xbox gamertag
              </label>
              <input
                id="settings-xbox-gt"
                className="input"
                placeholder="Gamertag (include #suffix if any)"
                value={xboxInput}
                onChange={(e) => setXboxInput(e.target.value)}
                style={{ flex: 1, minWidth: 160 }}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={anyBusy}>
                {xboxBusy ? 'Linking…' : 'Connect Xbox'}
              </button>
            </form>
          ) : null}
        </PlatformConnectionCard>
      )}
    </div>
  );
}
