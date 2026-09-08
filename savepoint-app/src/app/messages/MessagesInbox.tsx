'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listConversations } from '@/app/actions/messages';
import { ensureLocalKeyPair } from '@/lib/e2e-crypto';
import { getCachedInbox, putCachedInbox } from '@/lib/message-cache';
import UserAvatar from '@/components/ui/UserAvatar';
import { MessageIcon, PlusIcon } from '@/components/ui/Icons';
import { formatRelativeTime } from '@/lib/utils';

const INBOX_POLL_MS = 12000;

type ConversationRow = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  imageUrl: string | null;
  lastMessageAt: Date | string;
  lastMessageAtPreview: Date | string;
  unread: boolean;
  other: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    e2ePublicKey: string | null;
  } | null;
  members: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  }[];
};

export default function MessagesInbox({
  conversations: initial,
  userId,
}: {
  conversations: ConversationRow[];
  userId: string;
}) {
  const [keyNote, setKeyNote] = useState('');
  const [conversations, setConversations] = useState(initial);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    setConversations(initial);
    setFromCache(false);
    void putCachedInbox(userId, initial);
  }, [initial, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initial.length > 0) return;
      const cached = await getCachedInbox(userId);
      if (!cancelled && cached?.length) {
        setConversations(cached as ConversationRow[]);
        setFromCache(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, initial.length]);

  useEffect(() => {
    (async () => {
      try {
        await ensureLocalKeyPair();
        setKeyNote('Messages sync across your devices.');
      } catch {
        setKeyNote('Could not initialize encryption keys in this browser.');
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const next = await listConversations();
        if (!cancelled) {
          setConversations(next as ConversationRow[]);
          setFromCache(false);
          void putCachedInbox(userId, next as ConversationRow[]);
        }
      } catch {
        /* keep cached list */
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const id = window.setInterval(tick, INBOX_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0, flex: 1 }}>
          {keyNote} Private keys never leave your browser.
          {fromCache ? ' Showing cached inbox…' : ''}
        </p>
        <Link href="/messages/new-group" className="btn btn-primary btn-sm">
          <PlusIcon size={14} /> New group
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <MessageIcon size={40} color="var(--text-muted)" />
          </div>
          <div className="empty-state-title">No conversations yet</div>
          <div className="empty-state-text">Message friends or create a group chat.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/friends" className="btn btn-primary">
              Find friends
            </Link>
            <Link href="/messages/new-group" className="btn btn-outline">
              New group
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map((c) => {
            const title =
              c.type === 'GROUP' ? c.name || 'Group' : c.other?.name || c.other?.username || 'Chat';
            const subtitle =
              c.type === 'GROUP'
                ? `${c.members.length} members`
                : c.other
                  ? `@${c.other.username}`
                  : '';
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  background: c.unread ? 'rgba(0, 229, 160, 0.06)' : undefined,
                }}
              >
                {c.type === 'GROUP' ? (
                  <div className="avatar" style={{ width: 44, height: 44, overflow: 'hidden', borderRadius: '50%', flexShrink: 0 }}>
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (c.name || 'G').charAt(0).toUpperCase()
                    )}
                  </div>
                ) : (
                  <UserAvatar
                    className="avatar"
                    style={{ width: 44, height: 44 }}
                    src={c.other?.image}
                    name={c.other?.name}
                    username={c.other?.username || '?'}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatRelativeTime(new Date(c.lastMessageAtPreview))}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{subtitle}</div>
                </div>
                {c.unread && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
