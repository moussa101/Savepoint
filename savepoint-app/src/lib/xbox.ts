export type XboxTitle = {
  titleId: string;
  name: string;
  playtimeMinutes: number;
};

class XboxApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XboxApiError';
  }
}

function getOpenXblKey() {
  const key = process.env.OPENXBL_API_KEY;
  if (!key) throw new XboxApiError('Xbox library sync is not configured. Add OPENXBL_API_KEY to the server env.');
  return key;
}

function friendlyOpenXblError(status: number, body: string): string {
  let message = '';
  try {
    const json = JSON.parse(body) as { message?: string; code?: string };
    message = json.message || '';
  } catch {
    message = body.slice(0, 120);
  }

  if (status === 401 || status === 403) {
    return 'Xbox API key is invalid or missing permissions. Check OPENXBL_API_KEY.';
  }
  if (status === 404) {
    return 'Xbox gamertag not found. Check the spelling (include the #suffix if your tag has one).';
  }
  if (status === 429) {
    return 'Xbox API rate limit hit. Wait a minute and try again.';
  }
  if (message && !message.includes('No route matches') && !message.includes('try /v2/')) {
    return message;
  }
  return `Xbox lookup failed (${status}). Try again in a moment.`;
}

async function openXblGet(path: string) {
  // api.xbl.io serves /v2/... (no /api prefix)
  const normalized = path.startsWith('/v2/') ? path : path.replace(/^\/api/, '') || path;
  const response = await fetch(`https://api.xbl.io${normalized}`, {
    headers: {
      'X-Authorization': getOpenXblKey(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new XboxApiError(friendlyOpenXblError(response.status, text));
  }

  return response.json();
}

function pickProfile(data: Record<string, unknown>, fallbackGamertag: string) {
  const root = (data.content && typeof data.content === 'object'
    ? (data.content as Record<string, unknown>)
    : data) as Record<string, unknown>;

  const people = (root.people || root.profileUsers || root.results || data.people || data.profileUsers) as unknown;
  const first = Array.isArray(people) ? (people[0] as Record<string, unknown> | undefined) : undefined;

  const profileUser = Array.isArray(root.profileUsers)
    ? (root.profileUsers[0] as { id?: string; settings?: { id: string; value: string }[] })
    : Array.isArray(data.profileUsers)
      ? (data.profileUsers[0] as { id?: string; settings?: { id: string; value: string }[] })
      : undefined;

  const settingsGamertag =
    profileUser?.settings?.find((s) => s.id === 'Gamertag' || s.id === 'ModernGamertag')?.value;

  const resolvedXuid = String(
    root.xuid ||
      data.xuid ||
      first?.xuid ||
      first?.id ||
      profileUser?.id ||
      ''
  );

  const name = String(
    root.gamertag ||
      root.modernGamertag ||
      data.gamertag ||
      first?.gamertag ||
      first?.modernGamertag ||
      first?.displayName ||
      settingsGamertag ||
      fallbackGamertag
  );

  return { xuid: resolvedXuid, gamertag: name };
}

/**
 * Resolve gamertag → { xuid, gamertag } via OpenXBL.
 */
export async function resolveXboxGamertag(gamertag: string): Promise<{ xuid: string; gamertag: string }> {
  const cleaned = gamertag.trim();
  if (!cleaned) throw new XboxApiError('Enter your Xbox gamertag.');

  const encoded = encodeURIComponent(cleaned);
  const attempts = [
    `/v2/search/${encoded}`,
    `/v2/friends/search?gt=${encoded}`,
  ];

  let lastError: Error | null = null;

  for (const path of attempts) {
    try {
      const data = await openXblGet(path);
      const profile = pickProfile(data, cleaned);
      if (profile.xuid) return profile;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Xbox lookup failed');
      // Try next endpoint on 404-style failures
      if (err instanceof XboxApiError && err.message.includes('not found')) {
        continue;
      }
      // For non-404, still try other endpoints once
      continue;
    }
  }

  throw lastError || new XboxApiError('Xbox gamertag not found. Check the spelling (include the #suffix if shown).');
}

function parseMinutes(title: Record<string, unknown>): number {
  const candidates = [
    title.minutesPlayed,
    title.MinutesPlayed,
    title.playtime,
    (title.titleHistory as { minutesPlayed?: number } | undefined)?.minutesPlayed,
    (title.stats as { MinutesPlayed?: number } | undefined)?.MinutesPlayed,
  ];

  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return Math.max(0, Math.round(c));
    if (typeof c === 'string' && /^\d+$/.test(c)) return parseInt(c, 10);
  }

  const detail = title.detail as { minutesPlayed?: number } | undefined;
  if (typeof detail?.minutesPlayed === 'number') return Math.max(0, Math.round(detail.minutesPlayed));

  return 0;
}

/**
 * Fetch Xbox title history for an XUID.
 */
export async function fetchXboxTitleHistory(xuid: string): Promise<XboxTitle[]> {
  const data = await openXblGet(`/v2/player/titleHistory/${encodeURIComponent(xuid)}`);
  const root = (data?.content && typeof data.content === 'object' ? data.content : data) || {};
  const titles = root.titles || root.games || root.titleHistory || data?.titles || [];

  if (!Array.isArray(titles)) {
    throw new XboxApiError('Could not read Xbox title history. Try again later.');
  }

  return titles
    .map((t: Record<string, unknown>) => {
      const name = String(t.name || t.titleName || t.displayName || '').trim();
      const titleId = String(t.titleId || t.id || t.titleIdHex || '');
      if (!name) return null;
      return {
        titleId,
        name,
        playtimeMinutes: parseMinutes(t),
      } as XboxTitle;
    })
    .filter((t: XboxTitle | null): t is XboxTitle => t != null);
}
