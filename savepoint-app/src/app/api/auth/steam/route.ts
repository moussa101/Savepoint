import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildSteamOpenIdUrl, getAppBaseUrl } from '@/lib/steam';

/**
 * Starts the "Sign in through Steam" (OpenID 2.0) flow. The user must already
 * be signed in to Savepoint — Steam is linked to the existing account, it is
 * not a standalone login (Steam does not share an email address).
 */
export async function GET() {
  const base = getAppBaseUrl();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?next=/settings', base));
  }

  try {
    return NextResponse.redirect(buildSteamOpenIdUrl());
  } catch (error) {
    console.error('Steam OpenID start failed:', error);
    return NextResponse.redirect(new URL('/settings?steam=error', base));
  }
}
