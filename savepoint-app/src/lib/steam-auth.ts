import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { fetchSteamPersona, type SteamPersona } from '@/lib/steam';

const STEAM_LOGIN_TTL_MS = 5 * 60 * 1000;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return secret;
}

/** Synthetic email for Steam-only accounts (Steam never shares a real email). */
export function steamSyntheticEmail(steamId: string) {
  return `steam_${steamId}@steam.local`;
}

export function isSteamSyntheticEmail(email: string | null | undefined) {
  return !!email && email.endsWith('@steam.local');
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

function sanitizeUsername(raw: string) {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `steam${raw.replace(/\D/g, '').slice(-6) || 'player'}`;
}

async function uniqueUsername(base: string) {
  let candidate = base.slice(0, 30);
  for (let i = 0; i < 12; i++) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    const suffix = Math.floor(Math.random() * 10000);
    candidate = `${base.slice(0, 26)}${suffix}`;
  }
  return `steam${Date.now().toString(36)}`;
}

/**
 * Find an existing Steam-linked user, or create a new Savepoint account from
 * the verified SteamID (used for Continue with Steam on login/register).
 */
export async function findOrCreateSteamUser(steamId: string) {
  const existing = await prisma.user.findUnique({ where: { steamId } });
  if (existing) {
    if (existing.isBanned) {
      throw new Error('Banned');
    }
    return { user: existing, created: false as const };
  }

  let persona: SteamPersona | null = null;
  try {
    persona = await fetchSteamPersona(steamId);
  } catch (err) {
    console.error('Steam persona fetch failed:', err);
  }

  const baseUsername = sanitizeUsername(persona?.personaname || `steam${steamId.slice(-8)}`);
  const username = await uniqueUsername(baseUsername);
  const email = steamSyntheticEmail(steamId);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: persona?.personaname || username,
      image: persona?.avatarfull || persona?.avatarmedium || null,
      // Steam identity is verified via OpenID; there is no real email to confirm.
      emailVerified: new Date(),
      onboarded: false,
      steamId,
      steamLinkedAt: new Date(),
      password: null,
    },
  });

  return { user, created: true as const };
}
