'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteForum } from '@/app/actions/forums';

export default function AdminDeleteForum({ forumId }: { forumId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  return (
    <div>
      {!open ? (
        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#eb5757' }} onClick={() => setOpen(true)}>
          Delete with reason
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Deletion reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending || reason.trim().length < 3}
            onClick={() => {
              setError('');
              startTransition(async () => {
                const result = await deleteForum(forumId, reason);
                if ('error' in result) setError(result.error);
                else {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            Confirm
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-xs)', marginTop: 4 }}>{error}</p>}
    </div>
  );
}
