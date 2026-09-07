'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMyE2EPublicKey,
  publishE2EPublicKey,
  sendEncryptedMessage,
} from '@/app/actions/messages';
import { decryptMessage, encryptMessage, ensureLocalKeyPair } from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';

type WireMessage = {
  id: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  createdAt: Date | string;
  readAt: Date | string | null;
};

type Other = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  e2ePublicKey: string | null;
};

export default function ChatThread({
  conversationId,
  myUserId,
  other,
  initialMessages,
}: {
  conversationId: string;
  myUserId: string;
  other: Other;
  initialMessages: WireMessage[];
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [plainById, setPlainById] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [pending, startTransition] = useTransition();
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { publicKeyB64, pair } = await ensureLocalKeyPair();
        privateKeyRef.current = pair.privateKey;
        const serverKey = await getMyE2EPublicKey();
        if (serverKey !== publicKeyB64) {
          await publishE2EPublicKey(publicKeyB64);
        }
        if (!other.e2ePublicKey) {
          setSetupError(
            `@${other.username} hasn’t opened Messages yet, so encryption keys aren’t ready. Ask them to visit Messages once.`
          );
          setReady(true);
          return;
        }

        const decrypted: Record<string, string> = {};
        for (const m of initialMessages) {
          try {
            decrypted[m.id] = await decryptMessage(
              m.ciphertext,
              m.iv,
              pair.privateKey,
              other.e2ePublicKey
            );
          } catch {
            decrypted[m.id] = '[Unable to decrypt on this device]';
          }
        }
        if (!cancelled) {
          setPlainById(decrypted);
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setSetupError(e instanceof Error ? e.message : 'Could not set up encryption keys.');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, other.e2ePublicKey, other.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, plainById]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !privateKeyRef.current || !other.e2ePublicKey) return;
    setSendError('');
    startTransition(async () => {
      try {
        const { ciphertext, iv } = await encryptMessage(text, privateKeyRef.current!, other.e2ePublicKey!);
        const result = await sendEncryptedMessage(conversationId, ciphertext, iv);
        if (result.error || !result.message) {
          setSendError(result.error || 'Send failed');
          return;
        }
        setMessages((prev) => [...prev, result.message!]);
        setPlainById((prev) => ({ ...prev, [result.message!.id]: text }));
        setDraft('');
        router.refresh();
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Encryption failed');
      }
    });
  }

  return (
    <div className="chat-thread card" style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh', padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid var(--bg-surface-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <UserAvatar className="avatar" src={other.image} name={other.name} username={other.username} />
        <div style={{ flex: 1 }}>
          <Link href={`/profile/${other.username}`} style={{ fontWeight: 700 }}>
            {other.name || other.username}
          </Link>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)' }}>End-to-end encrypted</div>
        </div>
        <Link href="/messages" className="btn btn-ghost btn-sm">
          Back
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!ready && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Unlocking secure keys…</p>}
        {setupError && (
          <p role="status" style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
            {setupError}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === myUserId;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: 'min(520px, 85%)',
                padding: '0.65rem 0.9rem',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: mine ? 'rgba(0, 229, 160, 0.18)' : 'var(--bg-surface-hover)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {plainById[m.id] ?? '…'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: 8,
          padding: 'var(--space-md)',
          borderTop: '1px solid var(--bg-surface-border)',
        }}
      >
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder={other.e2ePublicKey ? 'Write a message…' : 'Waiting for their encryption key…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending || !other.e2ePublicKey || !ready}
          maxLength={4000}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || !draft.trim() || !other.e2ePublicKey}>
          Send
        </button>
      </form>
      {sendError && (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', padding: '0 var(--space-md) var(--space-md)' }}>
          {sendError}
        </p>
      )}
    </div>
  );
}
