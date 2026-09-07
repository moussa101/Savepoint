let cachedToken: string | null = null;
let tokenExpiration: number = 0;

export async function getTwitchToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Twitch API credentials');
  }

  // Check if token is still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiration - 5 * 60 * 1000) {
    return cachedToken;
  }

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST', cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Twitch access token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiration = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

type IGDBCacheMode = { revalidate?: number; cache?: RequestCache };

export async function fetchIGDB(
  endpoint: string,
  query: string,
  options: IGDBCacheMode = { revalidate: 3600 }
) {
  const token = await getTwitchToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
  };

  if (options.cache === 'no-store') {
    fetchOptions.cache = 'no-store';
  } else {
    fetchOptions.next = { revalidate: options.revalidate ?? 3600 };
  }

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, fetchOptions);

  if (!response.ok) {
    console.error('IGDB Error:', await response.text());
    throw new Error(`Failed to fetch from IGDB: ${response.statusText}`);
  }

  return response.json();
}

/** Always-fresh IGDB fetch (no Next.js Data Cache). */
export async function fetchIGDBFresh(endpoint: string, query: string) {
  return fetchIGDB(endpoint, query, { cache: 'no-store' });
}

// Helpers for processing image URLs
export function getIGDBImageUrl(imageId: string | undefined | null, size: 'cover_small' | 'cover_big' | '1080p' = 'cover_big') {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

// Types
export interface IGDBGame {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  genres?: { id: number; name: string }[];
  themes?: { id: number; name: string }[];
  platforms?: { id: number; name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
  websites?: { type: number; url: string }[];
  total_rating?: number;
  total_rating_count?: number;
  category?: number;
  similar_games?: IGDBGame[];
}

/** Official IGDB time-to-beat (seconds). Not from Savepoint users. */
export type IGDBTimeToBeat = {
  id: number;
  game_id: number;
  /** Rush / main-story-ish finish */
  hastily?: number;
  /** Typical finish with some extras */
  normally?: number;
  /** Completionist / 100% */
  completely?: number;
  count?: number;
};

export async function fetchIGDBTimeToBeat(igdbGameId: number): Promise<IGDBTimeToBeat | null> {
  if (!igdbGameId || igdbGameId <= 0) return null;
  const map = await fetchIGDBTimeToBeats([igdbGameId]);
  return map.get(igdbGameId) ?? null;
}

/** Batch-fetch IGDB time-to-beat rows (seconds) keyed by IGDB game id. */
export async function fetchIGDBTimeToBeats(
  igdbGameIds: number[]
): Promise<Map<number, IGDBTimeToBeat>> {
  const ids = [...new Set(igdbGameIds.filter((id) => Number.isInteger(id) && id > 0))];
  const out = new Map<number, IGDBTimeToBeat>();
  if (ids.length === 0) return out;

  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const rows = (await fetchIGDB(
        'game_time_to_beats',
        `fields game_id,hastily,normally,completely,count;
         where game_id = (${chunk.join(',')});
         limit ${chunk.length};`,
        { revalidate: 60 * 60 * 24 }
      )) as IGDBTimeToBeat[];
      for (const row of rows || []) {
        if (row?.game_id) out.set(row.game_id, row);
      }
    } catch (err) {
      console.error('IGDB time_to_beat batch failed:', err);
    }
  }
  return out;
}

/**
 * Main-story finish estimate in minutes (IGDB hastily → normally).
 * Returns null when IGDB has no story-length data (common for multiplayer).
 */
export function finishMinutesFromTimeToBeat(
  ttb: Pick<IGDBTimeToBeat, 'hastily' | 'normally'> | null | undefined
): number | null {
  if (!ttb) return null;
  const seconds = ttb.hastily || ttb.normally;
  if (!seconds || seconds <= 0) return null;
  return Math.round(seconds / 60);
}


