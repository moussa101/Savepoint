'use client';

import { useState, useTransition } from 'react';
import { TrashIcon } from '@/components/ui/Icons';
import { deleteUser } from '@/app/actions/admin';

interface Props {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export default function DeleteUserButton({ userId, username, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [banIp, setBanIp] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (isAdmin || username.toLowerCase() === 'savepoint') {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: '6px', color: 'var(--text-muted)', opacity: 0.4 }}
        title="This account cannot be deleted"
        disabled
      >
        <TrashIcon size={16} />
      </button>
    );
  }

  function confirmDelete() {
    setError('');
    startTransition(async () => {
      const result = await deleteUser(userId, banIp);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: '6px', color: '#eb5757' }}
        title={`Delete @${username}`}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <TrashIcon size={16} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-user-${userId}`}
          onClick={() => !pending && setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: '100%', padding: 'var(--space-xl)' }}
          >
            <h2
              id={`delete-user-${userId}`}
              className="font-display"
              style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-sm)' }}
            >
              Delete @{username}?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
              This permanently removes the account and their reviews, lists, messages, and library
              data. This cannot be undone.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 'var(--space-lg)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={banIp}
                disabled={pending}
                onChange={(e) => setBanIp(e.target.checked)}
              />
              Also ban their last known IP
            </label>

            {error ? (
              <p style={{ color: '#eb5757', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
                {error}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={confirmDelete}
                style={{ background: '#eb5757', borderColor: '#eb5757' }}
              >
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
