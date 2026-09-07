import { getAppBaseUrl } from '@/lib/app-url';

export type SteamOwnedGame = {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  playtime_2weeks?: number;
  img_icon_url?: string;
};

function getSteamApiKey() {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error('STEAM_WEB_API_KEY is not configured');
  return key;
}

export { getAppBaseUrl };

export type SteamOpenIdMode = 'login' | 'link';
export type SteamLinkReturn = 'library' | 'settings';

/** Build Steam OpenID URL. Query params are echoed on return_to. */
export function buildSteamOpenIdUrl(opts: {
  mode?: SteamOpenIdMode;
  returnTo?: SteamLinkReturn;
} = {}) {
  const mode = opts.mode ?? 'login';
  const q = new URLSearchParams({ mode });
  if (opts.returnTo) q.set('return', opts.returnTo);
  const returnTo = `${getAppBaseUrl()}/api/auth/steam/callback?${q.toString()}`;
  const realm = getAppBaseUrl();
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

export type SteamPersona = {
  steamid: string;
  personaname?: string;
  avatarfull?: string;
  avatarmedium?: string;
  profileurl?: string;
};

/** Public profile summary for username/avatar on first Steam sign-up. */
export async function fetchSteamPersona(steamId: string): Promise<SteamPersona | null> {
  const key = getSteamApiKey();
  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  url.searchParams.set('key', key);
  url.searchParams.set('steamids', steamId);

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Steam persona API error: ${response.status}`);
  }
  const data = await response.json();
  const player = data?.response?.players?.[0];
  return player ?? null;
}

export function extractSteamIdFromClaimedId(claimedId: string | null): string | null {
  if (!claimedId) return null;
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  return match?.[1] || null;
}

/** Verify Steam OpenID assertion (openid.mode=id_res). */
export async function verifySteamOpenId(params: URLSearchParams): Promise<boolean> {
  const body = new URLSearchParams(params);
  body.set('openid.mode', 'check_authentication');

  const response = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await response.text();
  return text.includes('is_valid:true');
}

export async function fetchSteamOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
  const key = getSteamApiKey();
  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
  url.searchParams.set('key', key);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('include_appinfo', '1');
  url.searchParams.set('include_played_free_games', '1');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`);
  }

  const data = await response.json();
  const games = data?.response?.games;
  if (!games) {
    // Empty response usually means private game details
    throw new Error(
      'Could not read Steam library. Make sure your Steam profile and Game details are set to Public.'
    );
  }

  return games as SteamOwnedGame[];
}
