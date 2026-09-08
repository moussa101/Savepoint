/**
 * Ephemeral typing state for chat (in-process). Fine for single-instance;
 * multi-instance deploys may miss some indicators until sticky sessions / Redis.
 */

export type TypingEntry = {
  userId: string;
  username: string;
  expiresAt: number;
};

type Store = Map<string, Map<string, TypingEntry>>;

const globalForTyping = globalThis as unknown as { __spTyping?: Store };

function store(): Store {
  if (!globalForTyping.__spTyping) globalForTyping.__spTyping = new Map();
  return globalForTyping.__spTyping;
}

const TTL_MS = 7000;

export function setTyping(conversationId: string, userId: string, username: string) {
  const byConv = store();
  let users = byConv.get(conversationId);
  if (!users) {
    users = new Map();
    byConv.set(conversationId, users);
  }
  users.set(userId, {
    userId,
    username: username || 'Someone',
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearTyping(conversationId: string, userId: string) {
  const users = store().get(conversationId);
  if (!users) return;
  users.delete(userId);
  if (users.size === 0) store().delete(conversationId);
}

export function listTyping(
  conversationId: string,
  excludeUserId: string
): { userId: string; username: string }[] {
  const users = store().get(conversationId);
  if (!users?.size) return [];
  const now = Date.now();
  const out: { userId: string; username: string }[] = [];
  for (const [id, entry] of users) {
    if (entry.expiresAt <= now) {
      users.delete(id);
      continue;
    }
    if (id === excludeUserId) continue;
    out.push({ userId: entry.userId, username: entry.username });
  }
  if (users.size === 0) store().delete(conversationId);
  return out;
}
