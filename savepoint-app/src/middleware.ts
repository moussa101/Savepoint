import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  // Only log if it's an API route or a page route, ignore static files and images
  const { pathname } = req.nextUrl;
  
  // Skip next internal paths, public files, trpc, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/track') || // prevent infinite loop
    pathname.startsWith('/api/banned-ips') || // prevent infinite loop
    pathname.includes('.') || // static files like .js, .css, .png
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Extract logging data
  const method = req.method;
  const path = req.nextUrl.pathname;
  
  // IP resolution works differently based on hosting provider (Vercel, Railway, etc.)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // Asynchronously send to our tracking endpoint so it doesn't block the request
  const trackPromise = fetch(`${req.nextUrl.origin}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method, ip, userAgent }),
  }).catch((e) => console.error('Failed to log traffic:', e));

  // Next.js specific way to keep the promise alive in Edge runtime
  event.waitUntil(trackPromise);

  // Check if IP is banned (Using a non-blocking fetch with aggressive Next.js cache)
  try {
    const banCheckUrl = new URL('/api/banned-ips', req.nextUrl.origin);
    const banRes = await fetch(banCheckUrl, { next: { revalidate: 60 } });
    const banData = await banRes.json();
    
    if (banData?.ips?.includes(ip)) {
      return new NextResponse('Your IP address has been banned for violating our community guidelines.', { status: 403 });
    }
  } catch (error) {
    // If check fails, allow traffic to proceed
    console.error('Failed to check banned IPs:', error);
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ensures we don't even run this middleware on static files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
