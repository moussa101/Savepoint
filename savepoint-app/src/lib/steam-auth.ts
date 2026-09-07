import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';

const STEAM_LOGIN_TTL_MS = 5 * 60 * 1000;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return secret;
}

/** Short-lived HMAC ticket exchanged for a NextAuth credentials session. */
export function mintSteamLoginToken(steamId: string): string {
  const exp = Date.now() + STEAM_LOGIN_TTL_MS;
  const payload = `${steamId}.${exp}`;
  const sig = createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySteamLoginToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [steamId, expStr, sig] = parts;
  if (!/^\d{17}$/.test(steamId)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const payload = `${steamId}.${expStr}`;
  const expected = createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return steamId;
}

/**
 * Look up a Savepoint user that already linked this SteamID.
 * Steam never creates a new Savepoint account — link from Settings/Library first.
 */
export async function findLinkedSteamUser(steamId: string) {
  const user = await prisma.user.findUnique({ where: { steamId } });
  if (!user) return null;
  if (user.isBanned) throw new Error('Banned');
  return user;
}
