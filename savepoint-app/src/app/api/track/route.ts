import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertInternalRequest, getClientIpFromRequest } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    assertInternalRequest(req);

    const data = await req.json();
    const path = typeof data.path === 'string' ? data.path.slice(0, 500) : '/';
    const method = typeof data.method === 'string' ? data.method.slice(0, 16) : 'GET';
    const ip =
      (typeof data.ip === 'string' && data.ip.slice(0, 128)) ||
      getClientIpFromRequest(req);
    const userAgent =
      (typeof data.userAgent === 'string' && data.userAgent.slice(0, 512)) ||
      'Unknown';

    await prisma.trafficLog.create({
      data: { path, method, ip, userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    console.error('Traffic logging error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
