'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  listConversations,
  listFriendsForShare,
  openConversationWithFriend,
  shareProfileSystemMessage,
} from '@/app/actions/messages';

type Friend = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export default function ShareProfileButton({
  profileUserId,
  profileUsername,
}: {
  profileUserId: string;
  profileUsername: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const list = await listFriendsForShare();
      setFriends((list as Friend[]).filter((f) => f.id !== profileUserId));
    });
  }, [open, profileUserId]);

  function shareWith(friendId: string) {
    setError('');
    startTransition(async () => {
      const opened = await openConversationWithFriend(friendId);
      if ('error' in opened && opened.error) {
        setError(opened.error);
        return;
      }
      if (!opened.conversationId) return;
      const sent = await shareProfileSystemMessage(opened.conversationId, profileUserId);
      if ('error' in sent && sent.error) {
        setError(sent.error);
        return;
      }
      setOpen(false);
      router.push(`/messages/${opened.conversationId}`);
    });
  }

  async function shareToExisting() {
    setError('');
    startTransition(async () => {
      const convos = await listConversations();
      const direct = convos.filter((c) => c.type === 'DIRECT' && c.other);
      if (!direct.length) {
        setError('No direct chats yet — pick a friend below.');
        return;
      }
      // Prefer first unread friend chat; otherwise first
      const target = direct[0]!;
      const sent = await shareProfileSystemMessage(target.id, profileUserId);
      if ('error' in sent && sent.error) {
        setError(sent.error);
        return;
      }
      setOpen(false);
      router.push(`/messages/${target.id}`);
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((v) => !v)}>
        Share profile
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            padding: 12,
            minWidth: 240,
            zIndex: 40,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>
            Share @{profileUsername} with a friend
          </p>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 8 }} onClick={shareToExisting} disabled={pending}>
            Share to latest chat
          </button>
          {friends.map((f) => (
            <button
              key={f.id}
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}
              disabled={pending}
              onClick={() => shareWith(f.id)}
            >
              @{f.username}
            </button>
          ))}
          {friends.length === 0 && !pending && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No friends to share with.</p>
          )}
          {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-xs)', marginTop: 6 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
