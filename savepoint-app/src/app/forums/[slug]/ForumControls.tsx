'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveForum,
  closeForum,
  deleteForum,
  joinForum,
  leaveForum,
  reopenForum,
} from '@/app/actions/forums';

export function JoinLeaveButton({
  forumId,
  isMember,
  isOwner,
}: {
  forumId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <div>
      <button
        type="button"
        className={isMember ? 'btn btn-outline' : 'btn btn-primary'}
        disabled={pending || isOwner}
        title={isOwner ? 'You own this forum' : undefined}
        onClick={() => {
          setError('');
          startTransition(async () => {
            const result = isMember ? await leaveForum(forumId) : await joinForum(forumId);
            if ('error' in result) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {pending ? '…' : isOwner ? 'Owner' : isMember ? 'Leave' : 'Join'}
      </button>
      {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-xs)', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export function ForumOwnerControls({ forumId }: { forumId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  function run(action: () => Promise<{ error?: string } | { success: true }>) {
    setError('');
    startTransition(async () => {
      const result = await action();
      if ('error' in result && result.error) setError(result.error);
      else {
        setShowDelete(false);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => closeForum(forumId))}>
        Close
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => archiveForum(forumId))}>
        Archive
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => reopenForum(forumId))}>
        Reopen
      </button>
      <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#eb5757' }} disabled={pending} onClick={() => setShowDelete((v) => !v)}>
        Delete
      </button>
      {showDelete && (
        <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <input
            className="input"
            placeholder="Reason for deletion (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending || reason.trim().length < 3}
            onClick={() => run(() => deleteForum(forumId, reason))}
          >
            Confirm delete
          </button>
        </div>
      )}
      {error && <p style={{ width: '100%', color: '#eb5757', fontSize: 'var(--text-xs)' }}>{error}</p>}
    </div>
  );
}
