import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { getClientIpFromRequest, getInternalApiSecret } from '@/lib/security';

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/api/banned-ips') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const method = req.method;
  const path = req.nextUrl.pathname;
  const ip = getClientIpFromRequest(req);
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  let internalSecret = '';
  try {
    internalSecret = getInternalApiSecret();
  } catch {
    // AUTH_SECRET missing — skip internal calls rather than crash
  }

  if (internalSecret) {
    const trackPromise = fetch(`${req.nextUrl.origin}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ path, method, ip, userAgent }),
    }).catch((e) => console.error('Failed to log traffic:', e));

    event.waitUntil(trackPromise);

    try {
      const banCheckUrl = new URL('/api/banned-ips', req.nextUrl.origin);
      const banRes = await fetch(banCheckUrl, {
        headers: { 'x-internal-secret': internalSecret },
        next: { revalidate: 60 },
      });
      const banData = await banRes.json();

      if (Array.isArray(banData?.ips) && banData.ips.includes(ip)) {
        return new NextResponse(
          'Your IP address has been banned for violating our community guidelines.',
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Failed to check banned IPs:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
