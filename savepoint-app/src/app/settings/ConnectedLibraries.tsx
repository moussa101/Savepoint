'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  linkXboxGamertag,
  syncSteamLibrary,
  syncXboxLibrary,
  unlinkSteam,
  unlinkXbox,
} from '@/app/actions/library-sync';
import { SteamIcon, XboxIcon } from '@/components/ui/Icons';

type Props = {
  steamId: string | null;
  steamLinkedAt: Date | string | null;
  steamLastSyncAt: Date | string | null;
  xboxGamertag: string | null;
  xboxLinkedAt: Date | string | null;
  xboxLastSyncAt: Date | string | null;
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
  steamLinkedAt,
  steamLastSyncAt,
  xboxGamertag,
  xboxLinkedAt,
  xboxLastSyncAt,
  steamQuery,
  showXbox = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [xboxInput, setXboxInput] = useState(xboxGamertag || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  function run(action: () => Promise<{ error?: string; success?: boolean; imported?: number; updated?: number; skipped?: number }>) {
    setMessage('');
    setError('');
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.success) {
          const parts = [];
          if (typeof result.imported === 'number') parts.push(`${result.imported} new`);
          if (typeof result.updated === 'number') parts.push(`${result.updated} updated`);
          if (typeof result.skipped === 'number' && result.skipped > 0) parts.push(`${result.skipped} not matched`);
          setMessage(parts.length ? `Sync complete: ${parts.join(', ')}.` : 'Library is already up to date.');
          router.refresh();
          return;
        }
        setError('Something went wrong. Please try again.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
        Import your owned games and playtime. Imported titles are tagged with their source; your manual ratings and statuses are never overwritten.
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
              Linked{steamLinkedAt ? ` · ${formatWhen(steamLinkedAt)}` : ''}
              {steamLastSyncAt ? ` · Last sync ${formatWhen(steamLastSyncAt)}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => run(syncSteamLibrary)}
              >
                {pending ? 'Working…' : 'Sync library'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => run(unlinkSteam)}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <a href="/api/auth/steam" className="btn btn-primary">
              Sign in through Steam
            </a>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
              You&apos;ll be sent to Steam to approve the link — we never see your Steam password. Your Steam profile
              and “Game details” must be set to Public for the import to work.
            </p>
          </>
        )}
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
                disabled={pending}
                onClick={() => run(syncXboxLibrary)}
              >
                {pending ? 'Working…' : 'Sync library'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => run(unlinkXbox)}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => linkXboxGamertag(xboxInput));
            }}
            style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              className="input"
              placeholder="Gamertag (include #suffix if any)"
              value={xboxInput}
              onChange={(e) => setXboxInput(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Linking…' : 'Connect Xbox'}
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
