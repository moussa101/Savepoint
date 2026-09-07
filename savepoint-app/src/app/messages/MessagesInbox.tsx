'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyE2EPublicKey, publishE2EPublicKey } from '@/app/actions/messages';
import { ensureLocalKeyPair } from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';
import { MessageIcon } from '@/components/ui/Icons';

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

export default function MessagesInbox({ conversations }: { conversations: ConversationRow[] }) {
  const [keyNote, setKeyNote] = useState('');

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
