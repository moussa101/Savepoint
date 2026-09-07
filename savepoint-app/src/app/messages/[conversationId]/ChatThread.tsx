'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getMyE2EPublicKey,
  pollConversationMessages,
  publishE2EPublicKey,
  sendEncryptedMessage,
} from '@/app/actions/messages';
import { decryptMessage, encryptMessage, ensureLocalKeyPair } from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';

const POLL_MS = 2000;

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

function latestCreatedAt(msgs: WireMessage[]): string | null {
  if (!msgs.length) return null;
  let max = new Date(msgs[0].createdAt).getTime();
  let iso = new Date(msgs[0].createdAt).toISOString();
  for (let i = 1; i < msgs.length; i++) {
    const t = new Date(msgs[i].createdAt).getTime();
    if (t >= max) {
      max = t;
      iso = new Date(msgs[i].createdAt).toISOString();
    }
  }
  return iso;
}

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
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [peerPublicKey, setPeerPublicKey] = useState(other.e2ePublicKey);
  const [plainById, setPlainById] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [pending, startTransition] = useTransition();
  const [sendError, setSendError] = useState('');
  const [live, setLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const peerKeyRef = useRef(other.e2ePublicKey);
  const knownIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const cursorRef = useRef<string | null>(latestCreatedAt(initialMessages));
  const pollingRef = useRef(false);

  peerKeyRef.current = peerPublicKey;

  const decryptIncoming = useCallback(async (batch: WireMessage[], peerKey: string | null) => {
    if (!privateKeyRef.current || !peerKey || !batch.length) return {};
    const decrypted: Record<string, string> = {};
    for (const m of batch) {
      try {
        decrypted[m.id] = await decryptMessage(
          m.ciphertext,
          m.iv,
          privateKeyRef.current,
          peerKey
        );
      } catch {
        decrypted[m.id] = '[Unable to decrypt on this device]';
      }
    }
    return decrypted;
  }, []);

  const mergeMessages = useCallback(
    async (incoming: WireMessage[], peerKey: string | null) => {
      const fresh = incoming.filter((m) => !knownIdsRef.current.has(m.id));
      if (!fresh.length) return;

      for (const m of fresh) knownIdsRef.current.add(m.id);
      cursorRef.current = latestCreatedAt([
        ...(cursorRef.current
          ? [{ id: '', senderId: '', ciphertext: '', iv: '', createdAt: cursorRef.current, readAt: null }]
          : []),
        ...fresh,
      ]);

      const decrypted = await decryptIncoming(fresh, peerKey);
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const next = [...prev];
        for (const m of fresh) {
          if (!ids.has(m.id)) next.push(m);
        }
        next.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return next;
      });
      if (Object.keys(decrypted).length) {
        setPlainById((prev) => ({ ...prev, ...decrypted }));
      }
    },
    [decryptIncoming]
  );

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

  // Realtime: short-interval poll while the tab is visible
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || pollingRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      pollingRef.current = true;
      try {
        const result = await pollConversationMessages(conversationId, cursorRef.current);
        if (cancelled || result.error || !result.messages) return;

        if (result.peerPublicKey && result.peerPublicKey !== peerKeyRef.current) {
          setPeerPublicKey(result.peerPublicKey);
          setSetupError('');
        }

        await mergeMessages(result.messages, result.peerPublicKey ?? peerKeyRef.current);
        setLive(true);
      } catch {
        // Keep the last known state; next tick retries.
      } finally {
        pollingRef.current = false;
      }
    }

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, conversationId, mergeMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, plainById]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !privateKeyRef.current || !peerPublicKey) return;
    setSendError('');
    startTransition(async () => {
      try {
        const { ciphertext, iv } = await encryptMessage(text, privateKeyRef.current!, peerPublicKey);
        const result = await sendEncryptedMessage(conversationId, ciphertext, iv);
        if (result.error || !result.message) {
          setSendError(result.error || 'Send failed');
          return;
        }
        knownIdsRef.current.add(result.message.id);
        const createdIso = new Date(result.message.createdAt).toISOString();
        if (!cursorRef.current || createdIso > cursorRef.current) {
          cursorRef.current = createdIso;
        }
        setMessages((prev) => [...prev, result.message!]);
        setPlainById((prev) => ({ ...prev, [result.message!.id]: text }));
        setDraft('');
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
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)' }}>
            End-to-end encrypted{live ? ' · Live' : ''}
          </div>
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
          placeholder={peerPublicKey ? 'Write a message…' : 'Waiting for their encryption key…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending || !peerPublicKey || !ready}
          maxLength={4000}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || !draft.trim() || !peerPublicKey}>
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
