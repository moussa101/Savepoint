import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildSteamOpenIdUrl, getAppBaseUrl, type SteamOpenIdMode } from '@/lib/steam';

/**
 * Starts Steam OpenID.
 * - `mode=login` (default): sign in or create a Savepoint account via Steam
 * - `mode=link`: attach Steam to the currently signed-in account (Library/Settings)
 */
export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const modeParam = request.nextUrl.searchParams.get('mode');
  const mode: SteamOpenIdMode = modeParam === 'link' ? 'link' : 'login';

  if (mode === 'link') {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login?next=/settings', base));
    }
  }

  try {
    return NextResponse.redirect(buildSteamOpenIdUrl(mode));
  } catch (error) {
    console.error('Steam OpenID start failed:', error);
    const fallback = mode === 'link' ? '/settings?steam=error' : '/login?error=steam';
    return NextResponse.redirect(new URL(fallback, base));
  }
}
