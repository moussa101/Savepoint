import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  extractSteamIdFromClaimedId,
  getAppBaseUrl,
  verifySteamOpenId,
  type SteamLinkReturn,
  type SteamOpenIdMode,
} from '@/lib/steam';
import { findLinkedSteamUser, mintSteamLoginToken } from '@/lib/steam-auth';

function linkDest(returnTo: SteamLinkReturn | undefined, steam: string) {
  const path = returnTo === 'library' ? '/library' : '/settings';
  return `${path}?steam=${steam}`;
}

export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const params = request.nextUrl.searchParams;
  const mode: SteamOpenIdMode = params.get('mode') === 'link' ? 'link' : 'login';
  const returnParam = params.get('return');
  const returnTo: SteamLinkReturn | undefined =
    returnParam === 'library' || returnParam === 'settings' ? returnParam : undefined;
  const session = await auth();

  if (params.get('openid.mode') === 'cancel') {
    const dest =
      mode === 'link' ? linkDest(returnTo, 'cancelled') : '/login?error=steam_cancelled';
    return NextResponse.redirect(new URL(dest, base));
  }

  try {
    const valid = await verifySteamOpenId(params);
    if (!valid) {
      const dest = mode === 'link' ? linkDest(returnTo, 'invalid') : '/login?error=steam';
      return NextResponse.redirect(new URL(dest, base));
    }

    const steamId = extractSteamIdFromClaimedId(params.get('openid.claimed_id'));
    if (!steamId) {
      const dest = mode === 'link' ? linkDest(returnTo, 'invalid') : '/login?error=steam';
      return NextResponse.redirect(new URL(dest, base));
    }

    // —— Link Steam onto the currently signed-in Savepoint account ——
    if (mode === 'link') {
      if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login?next=/settings', base));
      }

      const taken = await prisma.user.findFirst({
        where: { steamId, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.redirect(new URL(linkDest(returnTo, 'taken'), base));
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          steamId,
          steamLinkedAt: new Date(),
        },
      });

      return NextResponse.redirect(new URL(linkDest(returnTo, 'linked'), base));
    }

    // —— Sign in only if this SteamID is already linked (never create a user) ——
    let linked;
    try {
      linked = await findLinkedSteamUser(steamId);
    } catch (err) {
      if (err instanceof Error && err.message === 'Banned') {
        return NextResponse.redirect(new URL('/login?error=AccessDenied', base));
      }
      throw err;
    }

    if (!linked) {
      return NextResponse.redirect(new URL('/login?error=steam_not_linked', base));
    }

    const token = mintSteamLoginToken(steamId);
    const complete = new URL('/login/steam', base);
    complete.searchParams.set('token', token);
    return NextResponse.redirect(complete);
  } catch (error) {
    console.error('Steam OpenID callback failed:', error);
    const dest = mode === 'link' ? linkDest(returnTo, 'error') : '/login?error=steam';
    return NextResponse.redirect(new URL(dest, base));
  }
}
