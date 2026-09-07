'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteFriendToForum, listInviteableFriends } from '@/app/actions/forums';
import UserAvatar from '@/components/ui/UserAvatar';

type Friend = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export default function InviteFriendsButton({ forumId }: { forumId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await listInviteableFriends(forumId);
      if ('error' in result && result.error) setError(result.error);
      else setFriends([...(result.friends || [])]);
    });
  }, [open, forumId]);

  function invite(friendUserId: string) {
    setError('');
    setMessage('');
    startTransition(async () => {
      const result = await inviteFriendToForum(forumId, friendUserId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setMessage('Invite sent via message + notification');
      setFriends((prev) => prev.filter((f) => f.id !== friendUserId));
      if (result.conversationId) {
        // Keep them on the forum; they can open messages from the toast text.
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((v) => !v)}>
        Invite friends
      </button>
      {open && (
        <div
          className="card"
          style={{
            marginTop: 8,
            padding: 'var(--space-md)',
            minWidth: 260,
            maxWidth: 320,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>
            Sends a chat invite and a notification.
          </p>
          {friends.length === 0 && !pending && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No friends to invite.</p>
          )}
          {friends.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserAvatar
                  className="avatar"
                  style={{ width: 28, height: 28, fontSize: '0.75rem' }}
                  src={f.image}
                  name={f.name}
                  username={f.username}
                />
                <span style={{ fontSize: 'var(--text-sm)' }}>@{f.username}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() => invite(f.id)}
              >
                Invite
              </button>
            </div>
          ))}
          {message && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', marginTop: 6 }}>{message}</p>
          )}
          {error && (
            <p style={{ fontSize: 'var(--text-xs)', color: '#eb5757', marginTop: 6 }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
