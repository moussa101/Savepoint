'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/webauthn';
import {
  deletePasskey,
  listPasskeys,
  renamePasskey,
  type PasskeyListItem,
} from '@/app/actions/passkeys';
import { KeyIcon } from '@/components/ui/Icons';

export default function PasskeysManager({ initial }: { initial: PasskeyListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  async function refresh() {
    const next = await listPasskeys();
    setItems(next);
    router.refresh();
  }

  function addPasskey() {
    setError('');
    setStatus('');
    startTransition(async () => {
      try {
        await signIn('passkey', { action: 'register' });
        setStatus('Passkey added.');
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not add passkey.';
        if (/abort|cancel/i.test(msg)) {
          setError('Passkey setup was cancelled.');
        } else {
          setError(msg);
        }
      }
    });
  }

  function remove(credentialID: string) {
    if (!window.confirm('Remove this passkey? You won’t be able to use it to sign in.')) return;
    setError('');
    startTransition(async () => {
      const result = await deletePasskey(credentialID);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((p) => p.credentialID !== credentialID));
      setStatus('Passkey removed.');
    });
  }

  function saveName(credentialID: string) {
    setError('');
    startTransition(async () => {
      const result = await renamePasskey(credentialID, editName);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((p) =>
          p.credentialID === credentialID ? { ...p, name: editName.trim().slice(0, 64) } : p
        )
      );
      setEditingId(null);
      setStatus('Passkey renamed.');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div
        style={{
          padding: 'var(--space-md)',
          background: 'var(--bg-surface-hover)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Passkeys</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Sign in with Face ID, Touch ID, Windows Hello, or a hardware key
          </span>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={addPasskey}
          disabled={pending}
        >
          {pending ? 'Waiting…' : 'Add passkey'}
        </button>
      </div>

      {error && (
        <div className="auth-error" style={{ margin: 0 }}>
          {error}
        </div>
      )}
      {status && !error && (
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--accent-primary)' }}>
          {status}
        </p>
      )}

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          No passkeys yet. Add one on this device to unlock passwordless sign-in.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          {items.map((item) => (
            <li
              key={item.credentialID}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <KeyIcon size={18} color="var(--accent-primary)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === item.credentialID ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveName(item.credentialID);
                    }}
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                  >
                    <input
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. MacBook Touch ID"
                      maxLength={64}
                      autoFocus
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {item.name || 'Passkey'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.deviceType}
                      {item.backedUp ? ' · synced' : ''}
                      {' · '}
                      added {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              {editingId !== item.credentialID && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingId(item.credentialID);
                      setEditName(item.name || '');
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => remove(item.credentialID)}
                    disabled={pending}
                    style={{ color: 'var(--danger, #ff6b6b)' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
