import crypto from 'crypto';
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromAccountId,
  getProfileFromUserName,
  getPurchasedGames,
  getRecentlyPlayedGames,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  type AuthTokensResponse,
  type AuthorizationPayload,
  type Trophy,
  type TrophyTitle,
} from 'psn-api';
import { prisma } from '@/lib/db';

export class PsnApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PsnApiError';
  }
}

export type PsnPlayedTitle = {
  titleId: string;
  name: string;
  playtimeMinutes: number;
  lastPlayedAt: Date | null;
  imageUrl: string | null;
};

export type PsnMergedTrophy = {
  trophyId: number;
  trophyName: string;
  trophyDetail: string | null;
  trophyType: string;
  trophyIconUrl: string | null;
  trophyGroupId: string | null;
  earned: boolean;
  earnedDateTime: Date | null;
  rarity: number | null;
  earnedRate: number | null;
};

export type PsnAccountProfile = {
  accountId: string;
  onlineId: string;
  trophyLevel: number;
  trophyTier: number;
  trophyProgress: number;
  earnedBronze: number;
  earnedSilver: number;
  earnedGold: number;
  earnedPlatinum: number;
};

function getSealKey() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new PsnApiError('Server AUTH_SECRET is required to store PSN tokens securely.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/** Seal a secret for DB storage (AES-256-GCM). */
export function sealPsnSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSealKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function unsealPsnSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new PsnApiError('Stored PSN token is invalid. Disconnect and reconnect PlayStation.');
  }
  const [, ivB, tagB, dataB] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getSealKey(),
    Buffer.from(ivB!, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB!, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB!, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Parse ISO-8601 durations like PT228H56M33S into whole minutes. */
export function parseIsoDurationToMinutes(iso: string | null | undefined): number {
  if (!iso || !iso.startsWith('PT')) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return Math.max(0, Math.round(hours * 60 + minutes + seconds / 60));
}

export function cleanPsnGameName(name: string): string {
  return name
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function expiresAtFromSeconds(expiresIn: number): Date {
  // Refresh a minute early so mid-sync calls stay valid.
  return new Date(Date.now() + Math.max(30, expiresIn - 60) * 1000);
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Don't burn minutes retrying hard auth / permission failures.
      if (/401|403|unauthorized|forbidden|npsso|invalid.?token/i.test(msg)) {
        throw err;
      }
      if (i === attempts - 1) break;
      const delay = 400 * (i + 1);
      console.warn(`PSN ${label} attempt ${i + 1}/${attempts} failed; retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function exchangeNpssoForTokens(npsso: string): Promise<AuthTokensResponse> {
  const cleaned = npsso.trim();
  if (cleaned.length < 32) {
    throw new PsnApiError('That NPSSO looks too short. Paste the full token from ca.account.sony.com.');
  }
  try {
    const accessCode = await exchangeNpssoForAccessCode(cleaned);
    return await exchangeAccessCodeForAuthTokens(accessCode);
  } catch (err) {
    console.error('PSN NPSSO exchange failed:', err);
    throw new PsnApiError(
      'Could not authorize with PlayStation. Your NPSSO may be expired — sign in on playstation.com and copy a fresh one.'
    );
  }
}

export async function fetchPsnAccountProfile(
  authorization: AuthorizationPayload,
  accountIdHint?: string | null
): Promise<PsnAccountProfile> {
  // Prefer numeric accountId when we already know it — more reliable than "me".
  let accountId = accountIdHint || '';
  let summary: Awaited<ReturnType<typeof getUserTrophyProfileSummary>> | null = null;

  try {
    summary = await withRetry('trophySummary', () =>
      getUserTrophyProfileSummary(authorization, accountId || 'me')
    );
    accountId = summary.accountId || accountId;
  } catch (err) {
    console.warn('PSN trophySummary failed, will try profile fallback', err);
  }

  const profile = await withRetry('profile', () =>
    getProfileFromAccountId(authorization, accountId || 'me')
  );
  accountId = accountId || (summary?.accountId ?? '');

  let trophyLevel = Number(summary?.trophyLevel) || 0;
  let trophyTier = Number(summary?.tier ?? 1);
  let trophyProgress = Number(summary?.progress ?? 0);
  let earnedBronze = Number(summary?.earnedTrophies?.bronze ?? 0);
  let earnedSilver = Number(summary?.earnedTrophies?.silver ?? 0);
  let earnedGold = Number(summary?.earnedTrophies?.gold ?? 0);
  let earnedPlatinum = Number(summary?.earnedTrophies?.platinum ?? 0);

  // Legacy profile endpoint often has a fuller trophySummary when the modern one is empty.
  if (trophyLevel <= 1 && earnedBronze + earnedSilver + earnedGold + earnedPlatinum === 0 && profile.onlineId) {
    try {
      const legacy = await withRetry('legacyProfile', () =>
        getProfileFromUserName(authorization, profile.onlineId)
      );
      const ts = legacy?.profile?.trophySummary;
      if (ts) {
        trophyLevel = Number(ts.level) || trophyLevel;
        trophyProgress = Number(ts.progress ?? trophyProgress);
        earnedBronze = Number(ts.earnedTrophies?.bronze ?? earnedBronze);
        earnedSilver = Number(ts.earnedTrophies?.silver ?? earnedSilver);
        earnedGold = Number(ts.earnedTrophies?.gold ?? earnedGold);
        earnedPlatinum = Number(ts.earnedTrophies?.platinum ?? earnedPlatinum);
      }
      if (!accountId && legacy?.profile?.accountId) {
        accountId = String(legacy.profile.accountId);
      }
    } catch (err) {
      console.warn('PSN legacy profile trophy fallback failed', err);
    }
  }

  if (!accountId) {
    throw new PsnApiError('Could not resolve PlayStation account id.');
  }

  return {
    accountId,
    onlineId: profile.onlineId,
    trophyLevel,
    trophyTier,
    trophyProgress,
    earnedBronze,
    earnedSilver,
    earnedGold,
    earnedPlatinum,
  };
}

/** Load a valid access token for the user, refreshing when needed. */
export async function getValidPsnAuthorization(userId: string): Promise<AuthorizationPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      psnAccessToken: true,
      psnRefreshToken: true,
      psnTokenExpiresAt: true,
    },
  });

  if (!user?.psnRefreshToken || !user.psnAccessToken) {
    throw new PsnApiError('Connect PlayStation first.');
  }

  const stillValid =
    user.psnTokenExpiresAt && user.psnTokenExpiresAt.getTime() > Date.now() + 15_000;

  if (stillValid) {
    return { accessToken: unsealPsnSecret(user.psnAccessToken) };
  }

  try {
    const refreshed = await exchangeRefreshTokenForAuthTokens(unsealPsnSecret(user.psnRefreshToken));
    await prisma.user.update({
      where: { id: userId },
      data: {
        psnAccessToken: sealPsnSecret(refreshed.accessToken),
        psnRefreshToken: sealPsnSecret(refreshed.refreshToken),
        psnTokenExpiresAt: expiresAtFromSeconds(refreshed.expiresIn),
      },
    });
    return { accessToken: refreshed.accessToken };
  } catch (err) {
    console.error('PSN refresh failed:', err);
    throw new PsnApiError(
      'PlayStation session expired. Disconnect and reconnect with a fresh NPSSO from Settings.'
    );
  }
}

export function tokenPersistFields(tokens: AuthTokensResponse) {
  return {
    psnAccessToken: sealPsnSecret(tokens.accessToken),
    psnRefreshToken: sealPsnSecret(tokens.refreshToken),
    psnTokenExpiresAt: expiresAtFromSeconds(tokens.expiresIn),
  };
}

export async function fetchPsnPlayedGames(
  authorization: AuthorizationPayload,
  accountId = 'me',
  maxTitles = 800
): Promise<PsnPlayedTitle[]> {
  const titles: PsnPlayedTitle[] = [];
  let offset = 0;
  let guard = 0;

  while (titles.length < maxTitles && guard < 40) {
    guard += 1;
    const page = await withRetry(`playedGames@${offset}`, () =>
      getUserPlayedGames(authorization, accountId, {
        // Smaller pages are less likely to hit Sony connect timeouts.
        limit: Math.min(50, maxTitles - titles.length),
        offset,
        categories: 'ps4_game,ps5_native_game,pspc_game,unknown',
      })
    );

    for (const t of page.titles || []) {
      titles.push({
        titleId: t.titleId,
        name: cleanPsnGameName(t.name || t.localizedName || ''),
        playtimeMinutes: parseIsoDurationToMinutes(t.playDuration),
        lastPlayedAt: t.lastPlayedDateTime ? new Date(t.lastPlayedDateTime) : null,
        imageUrl: t.imageUrl || t.localizedImageUrl || null,
      });
    }

    const next = page.nextOffset;
    if (next == null || next === offset || !page.titles?.length) break;
    offset = next;
  }

  return titles.filter((t) => t.name.length >= 2).slice(0, maxTitles);
}

export async function fetchPsnTrophyTitles(
  authorization: AuthorizationPayload,
  accountId = 'me',
  maxTitles = 800
): Promise<TrophyTitle[]> {
  const titles: TrophyTitle[] = [];
  let offset = 0;
  let guard = 0;

  while (titles.length < maxTitles && guard < 40) {
    guard += 1;
    const pageSize = Math.min(50, maxTitles - titles.length);
    const page = await withRetry(`trophyTitles@${offset}`, () =>
      getUserTitles(authorization, accountId, {
        limit: pageSize,
        offset,
      })
    );

    const batch = page.trophyTitles || [];
    titles.push(...batch);

    const next = page.nextOffset;
    if (next == null || next === offset || batch.length === 0) break;
    if (typeof page.totalItemCount === 'number' && titles.length >= page.totalItemCount) break;
    offset = next;
  }

  return titles.slice(0, maxTitles);
}

/**
 * Purchased + recently played catalogs often include far more titles than the
 * trophy / "played games" endpoints (which only return trophy-synced titles).
 */
export async function fetchPsnOwnedCatalog(
  authorization: AuthorizationPayload,
  maxTitles = 800,
  opts?: { maxPurchasedPages?: number; includePurchased?: boolean }
): Promise<PsnPlayedTitle[]> {
  const byName = new Map<string, PsnPlayedTitle>();
  const includePurchased = opts?.includePurchased !== false;
  const maxPurchasedPages = opts?.maxPurchasedPages ?? 8;

  const add = (nameRaw: string, imageUrl: string | null, lastPlayedAt: Date | null) => {
    const name = cleanPsnGameName(nameRaw);
    if (name.length < 2) return;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, {
        titleId: key,
        name,
        playtimeMinutes: 0,
        lastPlayedAt,
        imageUrl,
      });
      return;
    }
    if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
    if (lastPlayedAt && (!existing.lastPlayedAt || lastPlayedAt > existing.lastPlayedAt)) {
      existing.lastPlayedAt = lastPlayedAt;
    }
  };

  // Recently played is one call and covers what users care about most.
  try {
    const recent = await withRetry('recentlyPlayed', () =>
      getRecentlyPlayedGames(authorization, {
        limit: Math.min(50, maxTitles),
        categories: ['ps4_game', 'ps5_native_game'],
      })
    );
    for (const g of recent?.data?.gameLibraryTitlesRetrieve?.games || []) {
      add(
        g.name,
        g.image?.url || null,
        g.lastPlayedDateTime ? new Date(g.lastPlayedDateTime) : null
      );
    }
  } catch (err) {
    console.warn('PSN recently-played catalog failed', err);
  }

  if (includePurchased) {
    try {
      let start = 0;
      for (let page = 0; page < maxPurchasedPages && byName.size < maxTitles; page++) {
        const size = Math.min(50, maxTitles - byName.size);
        const res = await withRetry(`purchased@${start}`, () =>
          getPurchasedGames(authorization, {
            size,
            start,
            platform: ['ps4', 'ps5'],
            isActive: true,
          })
        );
        const games = res?.data?.purchasedTitlesRetrieve?.games || [];
        if (!games.length) break;
        for (const g of games) {
          add(g.name, g.image?.url || null, null);
        }
        if (games.length < size) break;
        start += games.length;
      }
    } catch (err) {
      console.warn('PSN purchased catalog failed', err);
    }
  }

  return [...byName.values()].slice(0, maxTitles);
}

function npServiceOptions(platform: string | undefined) {
  const isPs5 = (platform || '').toUpperCase().includes('PS5');
  return isPs5 ? undefined : ({ npServiceName: 'trophy' as const });
}

export async function fetchMergedTrophiesForTitle(
  authorization: AuthorizationPayload,
  title: Pick<TrophyTitle, 'npCommunicationId' | 'trophyTitlePlatform' | 'npServiceName'>,
  accountId = 'me'
): Promise<PsnMergedTrophy[]> {
  const options = npServiceOptions(title.trophyTitlePlatform) ||
    (title.npServiceName === 'trophy' ? { npServiceName: 'trophy' as const } : undefined);

  const [{ trophies: defined }, { trophies: earned }] = await Promise.all([
    withRetry(`titleTrophies:${title.npCommunicationId}`, () =>
      getTitleTrophies(authorization, title.npCommunicationId, 'all', options)
    ),
    withRetry(`earnedTrophies:${title.npCommunicationId}`, () =>
      getUserTrophiesEarnedForTitle(authorization, accountId, title.npCommunicationId, 'all', options)
    ),
  ]);

  const definedById = new Map<number, Trophy>();
  for (const t of defined || []) definedById.set(t.trophyId, t);

  const merged: PsnMergedTrophy[] = [];
  for (const e of earned || []) {
    const meta = definedById.get(e.trophyId);
    merged.push({
      trophyId: e.trophyId,
      trophyName: meta?.trophyName || `Trophy #${e.trophyId}`,
      trophyDetail: meta?.trophyDetail || null,
      trophyType: meta?.trophyType || e.trophyType || 'bronze',
      trophyIconUrl: meta?.trophyIconUrl || null,
      trophyGroupId: meta?.trophyGroupId || null,
      earned: !!e.earned,
      earnedDateTime: e.earned && e.earnedDateTime ? new Date(e.earnedDateTime) : null,
      rarity: e.trophyRare ?? meta?.trophyRare ?? null,
      earnedRate: e.trophyEarnedRate != null ? Number(e.trophyEarnedRate) : null,
    });
  }
  return merged;
}
