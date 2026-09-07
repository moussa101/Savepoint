import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  buildSteamOpenIdUrl,
  getAppBaseUrl,
  type SteamLinkReturn,
  type SteamOpenIdMode,
} from '@/lib/steam';

/**
 * Starts Steam OpenID.
 * - `mode=link` (Library/Settings): attach Steam to the signed-in Savepoint account
 * - `mode=login`: sign into an existing Savepoint account that already linked Steam
 *   (never creates a new Savepoint user)
 */
export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const modeParam = request.nextUrl.searchParams.get('mode');
  const returnParam = request.nextUrl.searchParams.get('return');
  const mode: SteamOpenIdMode = modeParam === 'link' ? 'link' : 'login';
  const returnTo: SteamLinkReturn | undefined =
    returnParam === 'library' || returnParam === 'settings' ? returnParam : undefined;

  if (mode === 'link') {
    const session = await auth();
    if (!session?.user?.id) {
      const next = returnTo === 'library' ? '/library' : '/settings';
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, base));
    }
  }

  try {
    return NextResponse.redirect(buildSteamOpenIdUrl({ mode, returnTo }));
  } catch (error) {
    console.error('Steam OpenID start failed:', error);
    const fallback =
      mode === 'link'
        ? `/${returnTo === 'library' ? 'library' : 'settings'}?steam=error`
        : '/login?error=steam';
    return NextResponse.redirect(new URL(fallback, base));
  }
}
