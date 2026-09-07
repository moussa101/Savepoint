'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getMyE2EPublicKey,
  pollConversationMessages,
  publishE2EPublicKey,
  sendEncryptedMessage,
} from '@/app/actions/messages';
import { decryptMessage, encryptMessage, ensureLocalKeyPair } from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';

/** Poll cadence while chat is open (ms). */
const POLL_MS = 900;

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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [live, setLive] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const peerKeyRef = useRef(other.e2ePublicKey);
  const knownIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const cursorRef = useRef<string | null>(latestCreatedAt(initialMessages));
  const pollingRef = useRef(false);
  const stickToBottomRef = useRef(true);

  peerKeyRef.current = peerPublicKey;

  const scrollToBottom = useCallback((smooth = false) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Scroll only the chat pane — never the page.
    if (smooth) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    } else {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, []);

  const decryptIncoming = useCallback(async (batch: WireMessage[], peerKey: string | null) => {
    if (!privateKeyRef.current || !peerKey || !batch.length) return {};
    const entries = await Promise.all(
      batch.map(async (m) => {
        try {
          const text = await decryptMessage(
            m.ciphertext,
            m.iv,
            privateKeyRef.current!,
            peerKey
          );
          return [m.id, text] as const;
        } catch {
          return [m.id, '[Unable to decrypt on this device]'] as const;
        }
      })
    );
    return Object.fromEntries(entries);
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

        const decrypted = await decryptIncoming(initialMessages, other.e2ePublicKey);
        if (!cancelled) {
          setPlainById(decrypted);
          setReady(true);
          requestAnimationFrame(() => scrollToBottom(false));
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

  // Realtime: tight poll while the tab is visible (chain after each tick finishes).
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let timer: number | undefined;

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
        if (!cancelled) {
          timer = window.setTimeout(tick, POLL_MS);
        }
      }
    }

    void tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, conversationId, mergeMessages]);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom(true);
  }, [messages, plainById, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !privateKeyRef.current || !peerPublicKey || sending) return;
    setSendError('');
    setSending(true);
    setDraft('');

    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: WireMessage = {
      id: tempId,
      senderId: myUserId,
      ciphertext: '',
      iv: '',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    knownIdsRef.current.add(tempId);
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setPlainById((prev) => ({ ...prev, [tempId]: text }));

    try {
      const { ciphertext, iv } = await encryptMessage(text, privateKeyRef.current, peerPublicKey);
      const result = await sendEncryptedMessage(conversationId, ciphertext, iv);
      if (result.error || !result.message) {
        setSendError(result.error || 'Send failed');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setPlainById((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        knownIdsRef.current.delete(tempId);
        setDraft(text);
        return;
      }

      knownIdsRef.current.delete(tempId);
      knownIdsRef.current.add(result.message.id);
      const createdIso = new Date(result.message.createdAt).toISOString();
      if (!cursorRef.current || createdIso > cursorRef.current) {
        cursorRef.current = createdIso;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? result.message! : m))
      );
      setPlainById((prev) => {
        const next = { ...prev };
        delete next[tempId];
        next[result.message!.id] = text;
        return next;
      });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Encryption failed');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setPlainById((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      knownIdsRef.current.delete(tempId);
      setDraft(text);
    } finally {
      setSending(false);
    }
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

      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
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
                opacity: m.id.startsWith('local-') ? 0.75 : 1,
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
          disabled={!peerPublicKey || !ready}
          maxLength={4000}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim() || !peerPublicKey || !ready}>
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
