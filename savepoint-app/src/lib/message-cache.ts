/**
 * Browser-local message cache (IndexedDB).
 * Stores ciphertext metadata + decrypted plaintext on-device only.
 */

const DB_NAME = 'savepoint-messages';
const DB_VERSION = 1;
const THREAD_STORE = 'threads';
const INBOX_STORE = 'inbox';
const MAX_THREAD_MESSAGES = 200;

export type CachedSender = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type CachedWireMessage = {
  id: string;
  senderId: string;
  kind?: string | null;
  ciphertext: string;
  iv: string;
  systemPayload?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  readAt: string | null;
  sender?: CachedSender | null;
};

export type CachedThread = {
  conversationId: string;
  userId: string;
  messages: CachedWireMessage[];
  plainById: Record<string, string>;
  updatedAt: number;
};

export type CachedInboxConversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  imageUrl: string | null;
  lastMessageAt: string;
  lastMessageAtPreview: string;
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

function threadKey(userId: string, conversationId: string) {
  return `${userId}:${conversationId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(THREAD_STORE)) {
        db.createObjectStore(THREAD_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(INBOX_STORE)) {
        db.createObjectStore(INBOX_STORE, { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeMessage(m: {
  id: string;
  senderId: string;
  kind?: string | null;
  ciphertext: string;
  iv: string;
  systemPayload?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  editedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  readAt: Date | string | null;
  sender?: CachedSender | null;
}): CachedWireMessage | null {
  if (!m.id || m.id.startsWith('local-')) return null;
  const createdAt = toIso(m.createdAt);
  if (!createdAt) return null;
  return {
    id: m.id,
    senderId: m.senderId,
    kind: m.kind ?? null,
    ciphertext: m.ciphertext || '',
    iv: m.iv || '',
    systemPayload: m.systemPayload ?? null,
    createdAt,
    updatedAt: toIso(m.updatedAt ?? null),
    editedAt: toIso(m.editedAt ?? null),
    deletedAt: toIso(m.deletedAt ?? null),
    readAt: toIso(m.readAt),
    sender: m.sender
      ? {
          id: m.sender.id,
          username: m.sender.username,
          name: m.sender.name,
          image: m.sender.image,
        }
      : null,
  };
}

function isPlaceholderPlain(text: string) {
  return (
    !text ||
    text.startsWith('[Unable') ||
    text.startsWith('[Encrypted') ||
    text.startsWith('[Waiting') ||
    text === '[undecrypted]' ||
    text === '…'
  );
}

export async function getCachedThread(
  userId: string,
  conversationId: string
): Promise<CachedThread | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(THREAD_STORE, 'readonly');
      const req = tx.objectStore(THREAD_STORE).get(threadKey(userId, conversationId));
      req.onsuccess = () => {
        const row = req.result as (CachedThread & { key: string }) | undefined;
        if (!row || row.userId !== userId) {
          resolve(null);
          return;
        }
        resolve({
          conversationId: row.conversationId,
          userId: row.userId,
          messages: row.messages || [],
          plainById: row.plainById || {},
          updatedAt: row.updatedAt || 0,
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function putCachedThread(
  userId: string,
  conversationId: string,
  messages: Parameters<typeof normalizeMessage>[0][],
  plainById: Record<string, string>
): Promise<void> {
  try {
    const normalized = messages
      .map(normalizeMessage)
      .filter((m): m is CachedWireMessage => !!m)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-MAX_THREAD_MESSAGES);

    const plain: Record<string, string> = {};
    for (const m of normalized) {
      const text = plainById[m.id];
      if (text && !isPlaceholderPlain(text)) plain[m.id] = text;
    }

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(THREAD_STORE, 'readwrite');
      tx.objectStore(THREAD_STORE).put({
        key: threadKey(userId, conversationId),
        conversationId,
        userId,
        messages: normalized,
        plainById: plain,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* quota / private mode — ignore */
  }
}

export async function getCachedInbox(userId: string): Promise<CachedInboxConversation[] | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(INBOX_STORE, 'readonly');
      const req = tx.objectStore(INBOX_STORE).get(userId);
      req.onsuccess = () => {
        const row = req.result as
          | { userId: string; conversations: CachedInboxConversation[]; updatedAt: number }
          | undefined;
        resolve(row?.conversations?.length ? row.conversations : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function putCachedInbox(
  userId: string,
  conversations: Array<{
    id: string;
    type: 'DIRECT' | 'GROUP';
    name: string | null;
    imageUrl: string | null;
    lastMessageAt: Date | string;
    lastMessageAtPreview: Date | string;
    unread: boolean;
    other: CachedInboxConversation['other'];
    members: CachedInboxConversation['members'];
  }>
): Promise<void> {
  try {
    const normalized: CachedInboxConversation[] = conversations.slice(0, 80).map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      imageUrl: c.imageUrl,
      lastMessageAt: toIso(c.lastMessageAt) || new Date(0).toISOString(),
      lastMessageAtPreview: toIso(c.lastMessageAtPreview) || new Date(0).toISOString(),
      unread: !!c.unread,
      other: c.other,
      members: c.members || [],
    }));

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(INBOX_STORE, 'readwrite');
      tx.objectStore(INBOX_STORE).put({
        userId,
        conversations: normalized,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/** Merge server wire messages with cached plaintext for matching ciphertext. */
export function applyCachedPlaintext(
  messages: Array<{
    id: string;
    ciphertext: string;
    editedAt?: Date | string | null;
    deletedAt?: Date | string | null;
  }>,
  cached: CachedThread | null
): Record<string, string> {
  if (!cached) return {};
  const byId = new Map(cached.messages.map((m) => [m.id, m]));
  const out: Record<string, string> = {};
  for (const m of messages) {
    if (m.deletedAt) continue;
    const plain = cached.plainById[m.id];
    if (!plain || isPlaceholderPlain(plain)) continue;
    const prev = byId.get(m.id);
    // Reuse plaintext only if ciphertext unchanged (edits invalidate).
    if (prev && prev.ciphertext && prev.ciphertext !== m.ciphertext) continue;
    if (prev?.deletedAt) continue;
    out[m.id] = plain;
  }
  return out;
}
