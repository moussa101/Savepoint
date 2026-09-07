'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  editEncryptedMessage,
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
  kind?: string | null;
  ciphertext: string;
  iv: string;
  systemPayload?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  editedAt?: Date | string | null;
  readAt: Date | string | null;
};

type Other = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  e2ePublicKey: string | null;
};

function toMs(value: Date | string | null | undefined) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Sync cursor = newest createdAt / updatedAt / editedAt / readAt we've seen. */
function latestSyncCursor(msgs: WireMessage[]): string | null {
  let max = 0;
  let iso: string | null = null;
  for (const m of msgs) {
    for (const value of [m.createdAt, m.updatedAt, m.editedAt, m.readAt]) {
      const t = toMs(value);
      if (t > max) {
        max = t;
        iso = new Date(t).toISOString();
      }
    }
  }
  return iso;
}

function advanceCursor(current: string | null, msgs: WireMessage[]) {
  const next = latestSyncCursor(msgs);
  if (!next) return current;
  if (!current || next > current) return next;
  return current;
}

function MessageTicks({
  pending,
  read,
}: {
  pending?: boolean;
  read?: boolean;
}) {
  if (pending) {
    return (
      <span className="msg-ticks msg-ticks-pending" aria-label="Sending" title="Sending">
        ···
      </span>
    );
  }
  return (
    <span
      className={`msg-ticks${read ? ' msg-ticks-read' : ''}`}
      aria-label={read ? 'Read' : 'Sent'}
      title={read ? 'Read' : 'Sent'}
    >
      ✓✓
    </span>
  );
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const peerKeyRef = useRef(other.e2ePublicKey);
  const knownIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const cursorRef = useRef<string | null>(latestSyncCursor(initialMessages));
  const pollingRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  peerKeyRef.current = peerPublicKey;

  const scrollToBottom = useCallback((smooth = false) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (smooth) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    } else {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, []);

  const decryptIncoming = useCallback(async (batch: WireMessage[], peerKey: string | null) => {
    if (!privateKeyRef.current || !peerKey || !batch.length) return {};
    const withCipher = batch.filter(
      (m) => m.kind !== 'SYSTEM' && m.ciphertext && m.iv
    );
    const entries = await Promise.all(
      withCipher.map(async (m) => {
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
      if (!incoming.length) return;

      const fresh: WireMessage[] = [];
      const updated: WireMessage[] = [];
      for (const m of incoming) {
        if (knownIdsRef.current.has(m.id)) updated.push(m);
        else {
          knownIdsRef.current.add(m.id);
          fresh.push(m);
        }
      }

      cursorRef.current = advanceCursor(cursorRef.current, incoming);

      const toDecrypt = [
        ...fresh,
        ...updated.filter((m) => m.editedAt && m.ciphertext),
      ];
      const decrypted = await decryptIncoming(toDecrypt, peerKey);

      if (fresh.length || updated.length) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of updated) {
            const existing = byId.get(m.id);
            byId.set(m.id, existing ? { ...existing, ...m } : m);
          }
          for (const m of fresh) byId.set(m.id, m);
          return [...byId.values()].sort(
            (a, b) => toMs(a.createdAt) - toMs(b.createdAt)
          );
        });
      }
      if (Object.keys(decrypted).length) {
        setPlainById((prev) => ({ ...prev, ...decrypted }));
      }
    },
    [decryptIncoming]
  );

  useEffect(() => {
    document.body.classList.add('chat-open');
    return () => {
      document.body.classList.remove('chat-open');
    };
  }, []);

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
        if (cancelled || result.error) return;

        if (result.peerPublicKey && result.peerPublicKey !== peerKeyRef.current) {
          setPeerPublicKey(result.peerPublicKey);
          setSetupError('');
        }

        if (result.readReceipts?.length) {
          setMessages((prev) =>
            prev.map((m) => {
              const hit = result.readReceipts!.find((r) => r.id === m.id);
              return hit ? { ...m, readAt: hit.readAt } : m;
            })
          );
          for (const r of result.readReceipts) {
            const iso = new Date(r.readAt).toISOString();
            if (!cursorRef.current || iso > cursorRef.current) cursorRef.current = iso;
          }
        }

        if (result.messages?.length) {
          await mergeMessages(result.messages, result.peerPublicKey ?? peerKeyRef.current);
        }
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

  function startEdit(m: WireMessage) {
    if (m.senderId !== myUserId || m.id.startsWith('local-')) return;
    const age = Date.now() - toMs(m.createdAt);
    if (age > 24 * 60 * 60 * 1000) {
      setSendError('Messages can only be edited within 24 hours.');
      return;
    }
    setEditingId(m.id);
    setDraft(plainById[m.id] || '');
    setSendError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !privateKeyRef.current || !peerPublicKey || sending) return;
    setSendError('');
    setSending(true);

    if (editingId) {
      const id = editingId;
      try {
        const { ciphertext, iv } = await encryptMessage(text, privateKeyRef.current, peerPublicKey);
        const result = await editEncryptedMessage(id, ciphertext, iv);
        if (result.error || !result.message) {
          setSendError(result.error || 'Edit failed');
          return;
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...result.message! } : m))
        );
        setPlainById((prev) => ({ ...prev, [id]: text }));
        cursorRef.current = advanceCursor(cursorRef.current, [result.message]);
        setEditingId(null);
        setDraft('');
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Encryption failed');
      } finally {
        setSending(false);
      }
      return;
    }

    setDraft('');
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: WireMessage = {
      id: tempId,
      senderId: myUserId,
      ciphertext: '',
      iv: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: null,
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
      cursorRef.current = advanceCursor(cursorRef.current, [result.message]);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? result.message! : m)));
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
    <div
      className="chat-thread card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '70vh',
        height: '100%',
        padding: 0,
        overflow: 'hidden',
      }}
    >
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
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {!ready && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Unlocking secure keys…</p>
        )}
        {setupError && (
          <p
            role="status"
            style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 'var(--text-sm)' }}
          >
            {setupError}
          </p>
        )}
        {messages.map((m) => {
          if (m.kind === 'SYSTEM') {
            let invite: { forumName?: string; forumSlug?: string } | null = null;
            try {
              invite = m.systemPayload ? JSON.parse(m.systemPayload) : null;
            } catch {
              invite = null;
            }
            const mine = m.senderId === myUserId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: 'center',
                  maxWidth: 'min(480px, 92%)',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {mine ? 'You invited them to' : `${other.name || other.username} invited you to`}{' '}
                  <strong>{invite?.forumName || 'a forum'}</strong>
                </p>
                {invite?.forumSlug && (
                  <Link
                    href={`/forums/${invite.forumSlug}`}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 10 }}
                  >
                    Open forum
                  </Link>
                )}
              </div>
            );
          }

          const mine = m.senderId === myUserId;
          const pending = m.id.startsWith('local-');
          const edited = !!m.editedAt;
          const canEdit =
            mine &&
            !pending &&
            Date.now() - toMs(m.createdAt) <= 24 * 60 * 60 * 1000;
          return (
            <div
              key={m.id}
              className={`chat-bubble${mine ? ' is-mine' : ''}${editingId === m.id ? ' is-editing' : ''}`}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: 'min(520px, 85%)',
                padding: '0.65rem 0.9rem',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: mine ? 'rgba(0, 229, 160, 0.18)' : 'var(--bg-surface-hover)',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: pending ? 0.75 : 1,
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {plainById[m.id] ?? '…'}
              </div>
              <div
                className="chat-bubble-meta"
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {edited && <span>Edited</span>}
                <span>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {mine && <MessageTicks pending={pending} read={!!m.readAt} />}
                {canEdit && (
                  <button
                    type="button"
                    className="chat-edit-btn"
                    onClick={() => startEdit(m)}
                    disabled={sending}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          padding: 'var(--space-md)',
          borderTop: '1px solid var(--bg-surface-border)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {editingId && (
          <div
            style={{
              width: '100%',
              fontSize: 'var(--text-xs)',
              color: 'var(--accent-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Editing message</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          placeholder={
            peerPublicKey
              ? editingId
                ? 'Edit your message…'
                : 'Write a message…'
              : 'Waiting for their encryption key…'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!peerPublicKey || !ready}
          maxLength={4000}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !draft.trim() || !peerPublicKey || !ready}
        >
          {editingId ? 'Save' : 'Send'}
        </button>
      </form>
      {sendError && (
        <p
          style={{
            color: 'var(--danger)',
            fontSize: 'var(--text-xs)',
            padding: '0 var(--space-md) var(--space-md)',
          }}
        >
          {sendError}
        </p>
      )}
    </div>
  );
}
