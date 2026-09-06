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

