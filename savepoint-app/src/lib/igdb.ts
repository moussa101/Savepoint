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
    { method: 'POST', next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Twitch access token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiration = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

export async function fetchIGDB(endpoint: string, query: string) {
  const token = await getTwitchToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
    next: { revalidate: 3600 }, // Cache IGDB responses for an hour by default
  });

  if (!response.ok) {
    console.error('IGDB Error:', await response.text());
    throw new Error(`Failed to fetch from IGDB: ${response.statusText}`);
  }

  return response.json();
}

// Helpers for processing image URLs
export function getIGDBImageUrl(imageId: string | undefined | null, size: 'cover_big' | '1080p' = 'cover_big') {
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
  platforms?: { id: number; name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
  total_rating?: number;
  total_rating_count?: number;
}
