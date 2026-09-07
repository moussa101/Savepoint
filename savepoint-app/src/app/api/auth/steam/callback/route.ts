import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  extractSteamIdFromClaimedId,
  getAppBaseUrl,
  verifySteamOpenId,
  type SteamOpenIdMode,
} from '@/lib/steam';
import { findOrCreateSteamUser, mintSteamLoginToken } from '@/lib/steam-auth';

export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const params = request.nextUrl.searchParams;
  const mode: SteamOpenIdMode = params.get('mode') === 'link' ? 'link' : 'login';
  const session = await auth();

  if (params.get('openid.mode') === 'cancel') {
    const dest =
      mode === 'link' ? '/settings?steam=cancelled' : '/login?error=steam_cancelled';
    return NextResponse.redirect(new URL(dest, base));
  }

  try {
    const valid = await verifySteamOpenId(params);
    if (!valid) {
      const dest = mode === 'link' ? '/settings?steam=invalid' : '/login?error=steam';
      return NextResponse.redirect(new URL(dest, base));
    }

    const steamId = extractSteamIdFromClaimedId(params.get('openid.claimed_id'));
    if (!steamId) {
      const dest = mode === 'link' ? '/settings?steam=invalid' : '/login?error=steam';
      return NextResponse.redirect(new URL(dest, base));
    }

    // —— Link Steam to an existing signed-in account ——
    if (mode === 'link') {
      if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login?next=/settings', base));
      }

      const taken = await prisma.user.findFirst({
        where: { steamId, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.redirect(new URL('/settings?steam=taken', base));
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          steamId,
          steamLinkedAt: new Date(),
        },
      });

      return NextResponse.redirect(new URL('/settings?steam=linked', base));
    }

    // —— Login / register with Steam ——
    try {
      await findOrCreateSteamUser(steamId);
    } catch (err) {
      if (err instanceof Error && err.message === 'Banned') {
        return NextResponse.redirect(new URL('/login?error=AccessDenied', base));
      }
      throw err;
    }

    const token = mintSteamLoginToken(steamId);
    const complete = new URL('/login/steam', base);
    complete.searchParams.set('token', token);
    return NextResponse.redirect(complete);
  } catch (error) {
    console.error('Steam OpenID callback failed:', error);
    const dest = mode === 'link' ? '/settings?steam=error' : '/login?error=steam';
    return NextResponse.redirect(new URL(dest, base));
  }
}
