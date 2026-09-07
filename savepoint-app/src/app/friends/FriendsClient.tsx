'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from '@/app/actions/friends';
import { openConversationWithFriend } from '@/app/actions/messages';
import UserAvatar from '@/components/ui/UserAvatar';
import { MessageIcon, UsersIcon, XIcon, CheckIcon, PlusIcon } from '@/components/ui/Icons';

type SearchHit = Awaited<ReturnType<typeof searchUsers>>[number];

type Props = {
  incoming: Array<{
    id: string;
    requester: { id: string; username: string; name: string | null; image: string | null };
  }>;
  outgoing: Array<{
    id: string;
    addressee: { id: string; username: string; name: string | null; image: string | null };
  }>;
  friends: Array<{
    friendshipId: string;
    user: { id: string; username: string; name: string | null; image: string | null };
  }>;
};

export default function FriendsClient({ incoming, outgoing, friends }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const hits = await searchUsers(query);
        setResults(hits);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  function run(action: () => Promise<{ error?: string; success?: boolean; conversationId?: string }>) {
    setError('');
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.conversationId) {
        router.push(`/messages/${result.conversationId}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <section className="card">
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
          Find people
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
          Search by username or display name. Messaging requires an accepted friend request.
        </p>
        <input
          className="input"
          placeholder="Search @username or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        {searching && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-sm)' }}>
            Searching…
          </p>
        )}
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 'var(--space-md) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((u) => (
              <li
                key={u.id}
                className="friend-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-surface-hover)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Link href={`/profile/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                  <UserAvatar className="avatar" src={u.image} name={u.name} username={u.username} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || u.username}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>
                </Link>
                <div className="friend-row-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {u.relation === 'none' && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => sendFriendRequest(u.id))}>
                      <PlusIcon size={14} /> Add
                    </button>
                  )}
                  {u.relation === 'outgoing' && (
                    <span className="pill" style={{ fontSize: '0.7rem' }}>Pending</span>
                  )}
                  {u.relation === 'incoming' && u.friendshipId && (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => acceptFriendRequest(u.friendshipId!))}>
                        <CheckIcon size={14} /> Accept
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => declineFriendRequest(u.friendshipId!))}>
                        <XIcon size={14} />
                      </button>
                    </>
                  )}
                  {u.relation === 'friends' && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => openConversationWithFriend(u.id))}>
                      <MessageIcon size={14} /> Message
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {incoming.length > 0 && (
        <section>
          <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-md)' }}>
            Friend requests
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incoming.map((r) => (
              <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <UserAvatar className="avatar" src={r.requester.image} name={r.requester.name} username={r.requester.username} />
                <div style={{ flex: 1 }}>
                  <Link href={`/profile/${r.requester.username}`} style={{ fontWeight: 700 }}>
                    {r.requester.name || r.requester.username}
                  </Link>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>@{r.requester.username}</div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => acceptFriendRequest(r.id))}>
                  Accept
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => declineFriendRequest(r.id))}>
                  Decline
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-md)' }}>
            Sent requests
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {outgoing.map((r) => (
              <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <UserAvatar className="avatar" src={r.addressee.image} name={r.addressee.name} username={r.addressee.username} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.addressee.name || r.addressee.username}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Waiting for a response</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UsersIcon size={22} /> Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No friends yet — search above to send a request.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {friends.map((f) => (
              <div key={f.friendshipId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <UserAvatar className="avatar" src={f.user.image} name={f.user.name} username={f.user.username} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/profile/${f.user.username}`} style={{ fontWeight: 700 }}>
                    {f.user.name || f.user.username}
                  </Link>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>@{f.user.username}</div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => openConversationWithFriend(f.user.id))}>
                  <MessageIcon size={14} /> Message
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => removeFriend(f.user.id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
