'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { uploadChatImage } from '@/app/actions/upload';
import {
  decryptMessage,
  decryptWithGroupKey,
  encryptMessage,
  encryptWithGroupKey,
  ensureLocalKeyPair,
  unwrapGroupKey,
} from '@/lib/e2e-crypto';
import {
  applyCachedPlaintext,
  getCachedThread,
  putCachedThread,
} from '@/lib/message-cache';
import UserAvatar from '@/components/ui/UserAvatar';
import ReportButton from '@/components/ui/ReportButton';
import { MessageContent } from '@/components/messages/MessageContent';
import GifPicker from '@/components/messages/GifPicker';
import GroupManagePanel from '@/components/messages/GroupManagePanel';

/** Poll when the tab is visible; backoff when idle so we don’t saturate the DB. */
const POLL_MS_ACTIVE = 4000;
const POLL_MS_IDLE = 12000;
const TYPING_HEARTBEAT_MS = 2500;

type Sender = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

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
  sender?: Sender | null;
};

type Other = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  e2ePublicKey: string | null;
};

type Member = Sender & { role?: string; e2ePublicKey?: string | null };

function toMs(value: Date | string | null | undefined) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

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

function MessageTicks({ pending, read }: { pending?: boolean; read?: boolean }) {
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
  type,
  other,
  groupName,
  groupImageUrl,
  members,
  wrappedGroupKey,
  myRole,
  initialMessages,
}: {
  conversationId: string;
  myUserId: string;
  type: 'DIRECT' | 'GROUP';
  other: Other | null;
  groupName?: string | null;
  groupImageUrl?: string | null;
  members?: Member[];
  wrappedGroupKey?: string | null;
  myRole?: string | null;
  initialMessages: WireMessage[];
}) {
  const isGroup = type === 'GROUP';
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [peerPublicKey, setPeerPublicKey] = useState(other?.e2ePublicKey ?? null);
  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [plainById, setPlainById] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showGifs, setShowGifs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const keysFetchedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const peerKeyRef = useRef(other?.e2ePublicKey ?? null);
  const groupKeyRef = useRef<CryptoKey | null>(null);
  const knownIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const cursorRef = useRef<string | null>(latestSyncCursor(initialMessages));
  const pollingRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  const plainByIdRef = useRef(plainById);
  const cacheTimerRef = useRef<number | undefined>(undefined);
  const typingHeartbeatRef = useRef<number | undefined>(undefined);
  const typingActiveRef = useRef(false);

  peerKeyRef.current = peerPublicKey;
  groupKeyRef.current = groupKey;
  messagesRef.current = messages;
  plainByIdRef.current = plainById;

  const memberById = useCallback(
    (id: string) => {
      if (!isGroup) return other && other.id === id ? other : null;
      return (members || []).find((m) => m.id === id) || null;
    },
    [isGroup, members, other]
  );

  const scrollToBottom = useCallback((smooth = false) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (smooth) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    else scroller.scrollTop = scroller.scrollHeight;
  }, []);

  const notifyTyping = useCallback(
    async (typing: boolean) => {
      try {
        await fetch(`/api/messages/${conversationId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ typing }),
          keepalive: !typing,
        });
      } catch {
        /* ignore */
      }
    },
    [conversationId]
  );

  const stopTyping = useCallback(() => {
    if (typingHeartbeatRef.current) {
      window.clearInterval(typingHeartbeatRef.current);
      typingHeartbeatRef.current = undefined;
    }
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void notifyTyping(false);
    }
  }, [notifyTyping]);

  const onDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (editingId) return;
      const shouldType = value.trim().length > 0;
      if (!shouldType) {
        stopTyping();
        return;
      }
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void notifyTyping(true);
        typingHeartbeatRef.current = window.setInterval(() => {
          void notifyTyping(true);
        }, TYPING_HEARTBEAT_MS);
      }
    },
    [editingId, notifyTyping, stopTyping]
  );

  useEffect(() => () => stopTyping(), [stopTyping]);

  const decryptIncoming = useCallback(
    async (batch: WireMessage[], peerKey: string | null, gKey: CryptoKey | null) => {
      if (!privateKeyRef.current || !batch.length) return {};
      const entries = await Promise.all(
        batch
          .filter((m) => m.kind !== 'SYSTEM' && m.ciphertext && m.iv)
          .map(async (m) => {
            try {
              let text: string;
              if (isGroup) {
                if (!gKey) return [m.id, '[Waiting for group key]'] as const;
                text = await decryptWithGroupKey(m.ciphertext, m.iv, gKey);
              } else {
                if (!peerKey) return [m.id, '[Waiting for peer key]'] as const;
                text = await decryptMessage(
                  m.ciphertext,
                  m.iv,
                  privateKeyRef.current!,
                  peerKey
                );
              }
              return [m.id, text] as const;
            } catch {
              // Omit failures — never overwrite good plaintext with empty/`…`.
              return null;
            }
          })
      );
      return Object.fromEntries(entries.filter((e): e is readonly [string, string] => !!e));
    },
    [isGroup]
  );

  /** Never replace good plaintext with a failure placeholder. */
  const mergePlain = useCallback((incoming: Record<string, string>) => {
    const isPlaceholder = (t: string) =>
      !t ||
      t.startsWith('[Unable') ||
      t.startsWith('[Encrypted') ||
      t.startsWith('[Waiting') ||
      t === '[undecrypted]' ||
      t === '…';
    setPlainById((prev) => {
      const next = { ...prev };
      for (const [id, text] of Object.entries(incoming)) {
        const existing = prev[id];
        if (existing && !isPlaceholder(existing) && isPlaceholder(text)) continue;
        next[id] = text;
      }
      return next;
    });
  }, []);

  const redecryptAll = useCallback(
    async (peerKey: string | null, gKey: CryptoKey | null) => {
      if (!privateKeyRef.current) return;
      const decrypted = await decryptIncoming(messagesRef.current, peerKey, gKey);
      mergePlain(decrypted);
    },
    [decryptIncoming, mergePlain]
  );

  const mergeMessages = useCallback(
    async (incoming: WireMessage[], peerKey: string | null, gKey: CryptoKey | null) => {
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
      const toDecrypt = [...fresh, ...updated.filter((m) => m.editedAt && m.ciphertext)];
      const decrypted = await decryptIncoming(toDecrypt, peerKey, gKey);
      if (fresh.length || updated.length) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of updated) {
            const existing = byId.get(m.id);
            byId.set(m.id, existing ? { ...existing, ...m } : m);
          }
          for (const m of fresh) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
        });
      }
      if (Object.keys(decrypted).length) mergePlain(decrypted);
    },
    [decryptIncoming, mergePlain]
  );

  // Re-decrypt only when the active peer/group key fingerprint changes.
  const lastDecryptKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (!isGroup && !peerPublicKey) return;
    if (isGroup && !groupKey) return;
    const fingerprint = isGroup ? `g:${conversationId}:${!!groupKey}` : `d:${peerPublicKey}`;
    if (lastDecryptKeyRef.current === fingerprint) return;
    lastDecryptKeyRef.current = fingerprint;
    void redecryptAll(peerPublicKey, groupKey);
  }, [ready, peerPublicKey, groupKey, isGroup, conversationId, redecryptAll]);

  useEffect(() => {
    document.body.classList.add('chat-open');
    return () => document.body.classList.remove('chat-open');
  }, []);

  // Hydrate decrypted plaintext from IndexedDB before crypto finishes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedThread(myUserId, conversationId);
      if (cancelled || !cached) return;
      const fromCache = applyCachedPlaintext(initialMessages, cached);
      if (Object.keys(fromCache).length) {
        setPlainById((prev) => ({ ...fromCache, ...prev }));
      }
      // Keep any cached messages the server slice missed (older than take window).
      if (cached.messages.length) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of cached.messages) {
            if (!byId.has(m.id)) byId.set(m.id, m);
          }
          const merged = [...byId.values()].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
          knownIdsRef.current = new Set(merged.map((m) => m.id));
          cursorRef.current = latestSyncCursor(merged);
          return merged;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myUserId]);

  // Persist thread + plaintext locally (debounced).
  useEffect(() => {
    if (!ready) return;
    if (cacheTimerRef.current) window.clearTimeout(cacheTimerRef.current);
    cacheTimerRef.current = window.setTimeout(() => {
      void putCachedThread(myUserId, conversationId, messagesRef.current, plainByIdRef.current);
    }, 400);
    return () => {
      if (cacheTimerRef.current) window.clearTimeout(cacheTimerRef.current);
    };
  }, [ready, messages, plainById, myUserId, conversationId]);

  // Flush cache on leave.
  useEffect(() => {
    return () => {
      void putCachedThread(myUserId, conversationId, messagesRef.current, plainByIdRef.current);
    };
  }, [myUserId, conversationId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { pair } = await ensureLocalKeyPair();
        if (cancelled) return;
        privateKeyRef.current = pair.privateKey;

        let gKey: CryptoKey | null = null;
        if (isGroup) {
          if (!wrappedGroupKey) {
            setSetupError('Missing group encryption key. Ask an admin to re-add you.');
            setReady(true);
            return;
          }
          gKey = await unwrapGroupKey(wrappedGroupKey, pair.privateKey);
          if (!cancelled) setGroupKey(gKey);
        } else if (!other?.e2ePublicKey) {
          setSetupError(
            `@${other?.username || 'user'} hasn’t opened Messages yet, so encryption keys aren’t ready.`
          );
          setReady(true);
          return;
        }

        const decrypted = await decryptIncoming(
          initialMessages,
          other?.e2ePublicKey ?? null,
          gKey
        );
        if (!cancelled) {
          // Merge so failed decrypts don't wipe cached plaintext.
          mergePlain(decrypted);
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
  }, [conversationId]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      if (cancelled || pollingRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      pollingRef.current = true;
      let gotActivity = false;
      try {
        const since = cursorRef.current ? `since=${encodeURIComponent(cursorRef.current)}` : '';
        const needKeys =
          !keysFetchedRef.current ||
          (!isGroup && !peerKeyRef.current) ||
          (isGroup && !groupKeyRef.current);
        const keys = needKeys ? 'keys=1' : '';
        const qs = [since, keys].filter(Boolean).join('&');
        const res = await fetch(
          `/api/messages/${conversationId}/poll${qs ? `?${qs}` : ''}`,
          { cache: 'no-store' }
        );
        if (!res.ok || cancelled) return;
        const result = await res.json();
        if (result.error) return;
        const typingList = Array.isArray(result.typing)
          ? (result.typing as { userId: string; username: string }[])
          : [];
        setTypingUsers(typingList);
        gotActivity = !!(
          result.messages?.length ||
          result.readReceipts?.length ||
          typingList.length
        );

        if (needKeys) keysFetchedRef.current = true;

        let peerForDecrypt = peerKeyRef.current;
        let groupForDecrypt = groupKeyRef.current;
        let keyChanged = false;

        if (result.peerPublicKey && result.peerPublicKey !== peerKeyRef.current) {
          peerForDecrypt = result.peerPublicKey;
          peerKeyRef.current = result.peerPublicKey;
          setPeerPublicKey(result.peerPublicKey);
          setSetupError('');
          keyChanged = true;
        }
        if (result.wrappedGroupKey && privateKeyRef.current && !groupKeyRef.current) {
          try {
            const gk = await unwrapGroupKey(result.wrappedGroupKey, privateKeyRef.current);
            groupForDecrypt = gk;
            setGroupKey(gk);
            groupKeyRef.current = gk;
            keyChanged = true;
          } catch {
            /* keep existing */
          }
        }

        if (keyChanged && !result.messages?.length) {
          await redecryptAll(peerForDecrypt, groupForDecrypt);
        }

        if (result.readReceipts?.length) {
          setMessages((prev) =>
            prev.map((m) => {
              const hit = result.readReceipts!.find((r: { id: string; readAt: string }) => r.id === m.id);
              return hit ? { ...m, readAt: hit.readAt } : m;
            })
          );
          for (const r of result.readReceipts) {
            const iso = new Date(r.readAt).toISOString();
            if (!cursorRef.current || iso > cursorRef.current) cursorRef.current = iso;
          }
        }

        if (result.messages?.length) {
          await mergeMessages(result.messages, peerForDecrypt, groupForDecrypt);
          if (keyChanged) await redecryptAll(peerForDecrypt, groupForDecrypt);
        }
      } catch {
        /* retry */
      } finally {
        pollingRef.current = false;
        if (!cancelled) {
          timer = window.setTimeout(tick, gotActivity ? POLL_MS_ACTIVE : POLL_MS_IDLE);
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
  }, [ready, conversationId, mergeMessages, redecryptAll, isGroup]);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom(true);
  }, [messages, plainById, scrollToBottom]);

  const buildChatLog = useCallback(() => {
    const lines: string[] = [
      `Conversation: ${conversationId}`,
      `Type: ${type}`,
      isGroup ? `Group: ${groupName || 'Unnamed'}` : `Peer: @${other?.username || 'unknown'}`,
      `Exported: ${new Date().toISOString()}`,
      '---',
    ];
    for (const m of messages) {
      const when = new Date(m.createdAt).toISOString();
      if (m.kind === 'SYSTEM') {
        lines.push(`[${when}] SYSTEM ${m.systemPayload || ''}`.slice(0, 2000));
        continue;
      }
      const sender = m.sender || memberById(m.senderId);
      const who = sender?.username || m.senderId;
      const body = plainById[m.id] || '[undecrypted]';
      lines.push(`[${when}] @${who}: ${body}`);
    }
    return lines.join('\n').slice(0, 100_000);
  }, [conversationId, type, isGroup, groupName, other?.username, messages, plainById, memberById]);

  async function encryptOutgoing(text: string) {
    if (!privateKeyRef.current) throw new Error('Keys not ready');
    if (isGroup) {
      if (!groupKeyRef.current) throw new Error('Group key not ready');
      return encryptWithGroupKey(text, groupKeyRef.current);
    }
    if (!peerPublicKey) throw new Error('Peer key not ready');
    return encryptMessage(text, privateKeyRef.current, peerPublicKey);
  }

  function startEdit(m: WireMessage) {
    setEditingId(m.id);
    setDraft(plainById[m.id] || '');
    inputRef.current?.focus();
  }

  async function sendPlaintext(text: string, kind: 'CHAT' | 'MEDIA' = 'CHAT') {
    setSending(true);
    setSendError('');
    const localId = `local-${Date.now()}`;
    const optimistic: WireMessage = {
      id: localId,
      senderId: myUserId,
      kind,
      ciphertext: '',
      iv: '',
      createdAt: new Date().toISOString(),
      readAt: null,
      sender: memberById(myUserId) as Sender | undefined,
    };
    knownIdsRef.current.add(localId);
    setMessages((prev) => [...prev, optimistic]);
    setPlainById((prev) => ({ ...prev, [localId]: text }));

    try {
      const { ciphertext, iv } = await encryptOutgoing(text);
      const res = await fetch(`/api/messages/${conversationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', ciphertext, iv, kind }),
      });
      const result = (await res.json()) as {
        error?: string;
        message?: WireMessage;
      };
      if (result.error || !result.message) {
        setSendError(result.error || 'Send failed');
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        return;
      }
      knownIdsRef.current.delete(localId);
      knownIdsRef.current.add(result.message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === localId ? { ...result.message!, sender: m.sender } : m))
      );
      setPlainById((prev) => {
        const next = { ...prev };
        delete next[localId];
        next[result.message!.id] = text;
        return next;
      });
      cursorRef.current = advanceCursor(cursorRef.current, [result.message]);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed');
      setMessages((prev) => prev.filter((m) => m.id !== localId));
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    if (editingId) {
      setSending(true);
      try {
        const { ciphertext, iv } = await encryptOutgoing(text);
        const res = await fetch(`/api/messages/${conversationId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', messageId: editingId, ciphertext, iv }),
        });
        const result = (await res.json()) as { error?: string };
        if (result.error) setSendError(result.error);
        else {
          setPlainById((prev) => ({ ...prev, [editingId]: text }));
          setEditingId(null);
          setDraft('');
        }
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Edit failed');
      } finally {
        setSending(false);
      }
      return;
    }

    stopTyping();
    setDraft('');
    await sendPlaintext(text, 'CHAT');
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setSendError('');
    try {
      const fd = new FormData();
      fd.set('file', file);
      const uploaded = await uploadChatImage(fd);
      if ('error' in uploaded && uploaded.error) {
        setSendError(uploaded.error);
        return;
      }
      if (!uploaded.imageUrl) return;
      const isGif = file.type === 'image/gif' || uploaded.imageUrl.endsWith('.gif');
      const payload = JSON.stringify(
        isGif
          ? { type: 'GIF', url: uploaded.imageUrl }
          : { type: 'IMAGE', url: uploaded.imageUrl }
      );
      await sendPlaintext(payload, 'MEDIA');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const title = isGroup ? groupName || 'Group' : other?.name || other?.username || 'Chat';
  const subtitle = isGroup
    ? `${(members || []).length} members`
    : other
      ? `@${other.username}`
      : '';

  return (
    <div className="chat-thread">
      <div
        className="chat-thread-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 0 var(--space-md)',
          borderBottom: '1px solid var(--bg-surface-border)',
          marginBottom: 'var(--space-md)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <Link href="/messages" className="btn btn-ghost btn-sm">
          ←
        </Link>
        {isGroup ? (
          <button
            type="button"
            onClick={() => setShowGroupPanel((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, flex: 1, minWidth: 0, textAlign: 'left' }}
          >
            <div className="avatar" style={{ width: 40, height: 40, overflow: 'hidden', borderRadius: '50%', flexShrink: 0 }}>
              {groupImageUrl ? (
                <img src={groupImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (groupName || 'G').charAt(0).toUpperCase()
              )}
            </div>
            <div className="chat-thread-header-title" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{subtitle} · tap to manage</div>
            </div>
          </button>
        ) : (
          <>
            {other && (
              <Link href={`/profile/${other.username}`}>
                <UserAvatar className="avatar" style={{ width: 40, height: 40 }} src={other.image} name={other.name} username={other.username} />
              </Link>
            )}
            <div className="chat-thread-header-title" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{subtitle}</div>
            </div>
          </>
        )}
        <ReportButton
          targetType="CONVERSATION"
          targetId={conversationId}
          reportedUserId={isGroup ? undefined : other?.id}
          chatLog={buildChatLog}
          label="Report"
        />
        {isGroup && showGroupPanel && (
          <GroupManagePanel
            conversationId={conversationId}
            groupName={groupName || 'Group'}
            groupImageUrl={groupImageUrl || null}
            members={members || []}
            myUserId={myUserId}
            myRole={myRole || null}
            groupKey={groupKey}
            onClose={() => setShowGroupPanel(false)}
          />
        )}
      </div>

      <div
        ref={scrollerRef}
        className="chat-thread-messages"
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {!ready && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Unlocking secure keys…</p>
        )}
        {setupError && (
          <p role="status" style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
            {setupError}
          </p>
        )}

        {messages.map((m) => {
          if (m.kind === 'SYSTEM') {
            let payload: Record<string, unknown> | null = null;
            try {
              payload = m.systemPayload ? JSON.parse(m.systemPayload) : null;
            } catch {
              payload = null;
            }
            if (payload?.type === 'PROFILE_SHARE' && typeof payload.username === 'string') {
              return (
                <div key={m.id} style={{ alignSelf: 'center', maxWidth: 'min(420px, 92%)', width: '100%' }}>
                  <MessageContent plain={JSON.stringify(payload)} />
                </div>
              );
            }
            if (payload?.type === 'FORUM_INVITE') {
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: 'center',
                    maxWidth: 'min(480px, 92%)',
                    padding: '0.75rem 1rem',
                    borderRadius: 12,
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    Forum invite: <strong>{String(payload.forumName || 'Forum')}</strong>
                  </p>
                  {typeof payload.forumSlug === 'string' && (
                    <Link href={`/forums/${payload.forumSlug}`} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                      Open forum
                    </Link>
                  )}
                </div>
              );
            }
            return (
              <p key={m.id} style={{ alignSelf: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {payload?.type === 'GROUP_CREATED' ? `Group “${String(payload.name || '')}” created` : 'System message'}
              </p>
            );
          }

          const mine = m.senderId === myUserId;
          const pending = m.id.startsWith('local-');
          const sender = m.sender || memberById(m.senderId);
          const canEdit =
            mine && !pending && Date.now() - toMs(m.createdAt) <= 24 * 60 * 60 * 1000;

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: mine ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-end',
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: 'min(560px, 92%)',
              }}
            >
              {!mine && (
                <Link href={sender ? `/profile/${sender.username}` : '#'} style={{ flexShrink: 0 }}>
                  <UserAvatar
                    className="avatar"
                    style={{ width: 28, height: 28, fontSize: '0.7rem' }}
                    src={sender?.image}
                    name={sender?.name}
                    username={sender?.username || '?'}
                  />
                </Link>
              )}
              <div
                className={`chat-bubble${mine ? ' is-mine' : ''}`}
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: mine ? 'rgba(0, 229, 160, 0.18)' : 'var(--bg-surface-hover)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: pending ? 0.75 : 1,
                  minWidth: 0,
                }}
              >
                {isGroup && !mine && sender && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: 4, fontWeight: 600 }}>
                    {sender.name || sender.username}
                  </div>
                )}
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  {plainById[m.id] ? <MessageContent plain={plainById[m.id]} /> : '…'}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    display: 'flex',
                    gap: 6,
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {!!m.editedAt && <span>Edited</span>}
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {mine && <MessageTicks pending={pending} read={!!m.readAt} />}
                  {canEdit && (
                    <button type="button" className="chat-edit-btn" onClick={() => startEdit(m)} disabled={sending}>
                      Edit
                    </button>
                  )}
                  {!mine && (
                    <ReportButton
                      targetType="MESSAGE"
                      targetId={m.id}
                      reportedUserId={m.senderId}
                      chatLog={buildChatLog}
                      label="Report"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showGifs && (
        <GifPicker
          onClose={() => setShowGifs(false)}
          onSelect={async (gif) => {
            setShowGifs(false);
            await sendPlaintext(
              JSON.stringify({
                type: 'GIF',
                url: gif.url,
                previewUrl: gif.previewUrl,
                giphyId: gif.id,
              }),
              'MEDIA'
            );
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="chat-composer">
        {sendError && (
          <p style={{ color: '#eb5757', fontSize: 'var(--text-xs)', marginBottom: 6 }}>{sendError}</p>
        )}
        {typingUsers.length > 0 && (
          <p className="chat-typing-indicator" aria-live="polite">
            {typingUsers.length === 1
              ? `${typingUsers[0]!.username} is typing`
              : typingUsers.length === 2
                ? `${typingUsers[0]!.username} and ${typingUsers[1]!.username} are typing`
                : `${typingUsers.length} people are typing`}
            <span className="chat-typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </p>
        )}
        <div className="chat-composer-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => onPickImage(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!ready || sending || uploading}
            onClick={() => fileRef.current?.click()}
            title="Attach image"
            aria-label="Attach image"
          >
            {uploading ? '…' : 'Img'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!ready || sending}
            onClick={() => setShowGifs((v) => !v)}
            title="GIF"
            aria-label="GIF"
          >
            GIF
          </button>
          <input
            ref={inputRef}
            className="input"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={editingId ? 'Edit message…' : 'Message…'}
            disabled={!ready || sending}
            style={{ flex: 1, minWidth: 0 }}
          />
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingId(null);
                setDraft('');
              }}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={!ready || sending || !draft.trim()}>
            {editingId ? 'Save' : 'Send'}
          </button>
        </div>
        {isGroup && myRole && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
            You are {myRole.toLowerCase()} of this group
          </p>
        )}
      </form>
    </div>
  );
}
