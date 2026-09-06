import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildSteamOpenIdUrl } from '@/lib/steam';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
  }

  try {
    return NextResponse.redirect(buildSteamOpenIdUrl());
  } catch (error) {
    console.error('Steam OpenID start failed:', error);
    return NextResponse.redirect(
      new URL('/settings?steam=error', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  }
}
