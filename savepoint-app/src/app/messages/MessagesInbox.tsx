'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyE2EPublicKey, listConversations, publishE2EPublicKey } from '@/app/actions/messages';
import { ensureLocalKeyPair } from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';
import { MessageIcon } from '@/components/ui/Icons';

const INBOX_POLL_MS = 2500;

type ConversationRow = {
  id: string;
  lastMessageAt: Date | string;
  unread: boolean;
  other: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    e2ePublicKey: string | null;
  };
};

export default function MessagesInbox({ conversations: initial }: { conversations: ConversationRow[] }) {
  const [keyNote, setKeyNote] = useState('');
  const [conversations, setConversations] = useState(initial);

  useEffect(() => {
    setConversations(initial);
  }, [initial]);

  useEffect(() => {
    (async () => {
      try {
        const { publicKeyB64 } = await ensureLocalKeyPair();
        const server = await getMyE2EPublicKey();
        if (server !== publicKeyB64) {
          await publishE2EPublicKey(publicKeyB64);
          setKeyNote('Encryption keys ready on this device.');
        } else {
          setKeyNote('End-to-end encryption is active on this device.');
        }
      } catch {
        setKeyNote('Could not initialize encryption keys in this browser.');
      }
    })();
  }, []);

  // Keep inbox order / unread badges fresh without a full page reload
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const next = await listConversations();
        if (!cancelled) setConversations(next);
      } catch {
        // ignore transient errors
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
  }, []);

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
        {keyNote} Private keys never leave your browser — the server only stores ciphertext.
      </p>

      {conversations.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <MessageIcon size={40} color="var(--text-muted)" />
          </div>
          <div className="empty-state-title">No conversations yet</div>
          <div className="empty-state-text">Add friends, then message them from the Friends page.</div>
          <Link href="/friends" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
            Find friends
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map((c) => (
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
              <UserAvatar
                className="avatar"
                src={c.other.image}
                name={c.other.name}
                username={c.other.username}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{c.other.name || c.other.username}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  @{c.other.username}
                  {!c.other.e2ePublicKey ? ' · waiting for their key' : ''}
                </div>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>
                {new Date(c.lastMessageAt).toLocaleDateString()}
                {c.unread && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', marginLeft: 'auto', marginTop: 6 }} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
