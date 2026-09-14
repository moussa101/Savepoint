import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getClientIpFromRequest, getInternalApiSecret } from '@/lib/security';

/**
 * Performance notes
 * -----------------
 * This runs on every request, so it must never block on the database.
 *  - The banned-IP list is cached in module memory for BAN_CACHE_TTL_MS and
 *    refreshed in the background; a cold cache is filled once per instance.
 *  - Traffic logging is fire-and-forget (event.waitUntil) and skipped for
 *    prefetches, auth/session polling and other internal chatter.
 */

const BAN_CACHE_TTL_MS = 60_000;

let bannedIpCache: { ips: Set<string>; fetchedAt: number } | null = null;
let bannedIpInflight: Promise<Set<string>> | null = null;

async function loadBannedIps(origin: string, secret: string): Promise<Set<string>> {
  if (bannedIpInflight) return bannedIpInflight;

  bannedIpInflight = (async () => {
    try {
      const res = await fetch(new URL('/api/banned-ips', origin), {
        headers: { 'x-internal-secret': secret },
        cache: 'no-store',
      });
      const data = await res.json();
      const ips = new Set<string>(Array.isArray(data?.ips) ? data.ips : []);
      bannedIpCache = { ips, fetchedAt: Date.now() };
      return ips;
    } catch (error) {
      console.error('Failed to check banned IPs:', error);
      // Keep serving the stale list (or an empty one) rather than failing requests.
      return bannedIpCache?.ips ?? new Set<string>();
    } finally {
      bannedIpInflight = null;
    }
  })();

  return bannedIpInflight;
}

async function getBannedIps(
  origin: string,
  secret: string,
  event: NextFetchEvent
): Promise<Set<string>> {
  const now = Date.now();

  if (bannedIpCache) {
    // Stale-while-revalidate: serve the cached list immediately and refresh in the background.
    if (now - bannedIpCache.fetchedAt > BAN_CACHE_TTL_MS && !bannedIpInflight) {
      event.waitUntil(loadBannedIps(origin, secret));
    }
    return bannedIpCache.ips;
  }

  // Cold cache: fail open immediately, refresh in the background.
  event.waitUntil(loadBannedIps(origin, secret));
  return new Set<string>();
}

function isPrefetch(req: NextRequest): boolean {
  return (
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('sec-purpose')?.includes('prefetch') === true
  );
}

function shouldTrack(req: NextRequest, pathname: string): boolean {
  if (req.method !== 'GET' && req.method !== 'POST') return false;
  if (isPrefetch(req)) return false;
  // Session polling, notifications polling and other internal API chatter would
  // otherwise dominate the traffic log without adding signal.
  if (pathname.startsWith('/api/auth/')) return false;
  if (pathname.startsWith('/api/notifications')) return false;
  if (pathname.startsWith('/api/messages/')) return false;
  if (pathname.startsWith('/api/track')) return false;
  // RSC payload requests for client-side navigations are already logged as the page.
  if (req.headers.get('rsc') === '1' && req.headers.get('next-url')) return false;
  // Sample ~15% of navigations to cut DB write load.
  if (Math.random() > 0.15) return false;
  return true;
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  // strict-dynamic + nonce: Next.js runtime scripts and their children are allowed.
  // unsafe-eval only in dev (React Refresh / Turbopack).
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://images.igdb.com https://*.r2.dev https://*.cloudflarestorage.com https://authjs.dev https://*.googleusercontent.com https://lh3.googleusercontent.com https://cdn.discordapp.com https://media.discordapp.net https://avatars.steamstatic.com https://*.steamstatic.com https://steamcdn-a.akamaihd.net https://*.akamaihd.net https://graph.microsoft.com https://*.xboxlive.com https://*.live.net https://image.api.playstation.com https://*.playstation.com https://*.playstation.net https://*.giphy.com https://media.giphy.com https://i.giphy.com https://cdn.jsdelivr.net",
    "media-src 'self' https://*.giphy.com https://media.giphy.com https://i.giphy.com",
    "connect-src 'self' https://api.igdb.com https://id.twitch.tv https://api.sightengine.com https://api.steampowered.com https://steamcommunity.com https://api.xbl.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://steamcommunity.com",
  ].join('; ');
}

function withSecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  res.headers.set('Content-Security-Policy', buildCsp(nonce));
  res.headers.set('x-nonce', nonce);
  return res;
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/api/banned-ips') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return withSecurityHeaders(NextResponse.next(), nonce);
  }

  // Admin: refuse before any RSC/page work (layout+page run in parallel otherwise).
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    const token = secret
      ? await getToken({
          req,
          secret,
          secureCookie: process.env.NODE_ENV === 'production',
        })
      : null;

    if (!token?.id || !(token as { isAdmin?: boolean }).isAdmin) {
      const res = new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
      return withSecurityHeaders(res, nonce);
    }
  }

  let internalSecret = '';
  try {
    internalSecret = getInternalApiSecret();
  } catch {
    // AUTH_SECRET missing — skip internal calls rather than crash
  }
  if (!internalSecret) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce
    );
  }

  const ip = getClientIpFromRequest(req);
  const origin = req.nextUrl.origin;

  const bannedIps = await getBannedIps(origin, internalSecret, event);
  if (bannedIps.has(ip)) {
    return withSecurityHeaders(
      new NextResponse(
        'Your IP address has been banned for violating our community guidelines.',
        { status: 403 }
      ),
      nonce
    );
  }

  if (shouldTrack(req, pathname)) {
    const trackPromise = fetch(`${origin}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        path: pathname,
        method: req.method,
        ip,
        userAgent: req.headers.get('user-agent') || 'Unknown',
      }),
    }).catch((e) => console.error('Failed to log traffic:', e));

    event.waitUntil(trackPromise);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
