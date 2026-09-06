import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractSteamIdFromClaimedId, getAppBaseUrl, verifySteamOpenId } from '@/lib/steam';

export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', base));
  }

  const params = request.nextUrl.searchParams;
  if (params.get('openid.mode') === 'cancel') {
    return NextResponse.redirect(new URL('/settings?steam=cancelled', base));
  }

  try {
    const valid = await verifySteamOpenId(params);
    if (!valid) {
      return NextResponse.redirect(new URL('/settings?steam=invalid', base));
    }

    const steamId = extractSteamIdFromClaimedId(params.get('openid.claimed_id'));
    if (!steamId) {
      return NextResponse.redirect(new URL('/settings?steam=invalid', base));
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
  } catch (error) {
    console.error('Steam OpenID callback failed:', error);
    return NextResponse.redirect(new URL('/settings?steam=error', base));
  }
}
