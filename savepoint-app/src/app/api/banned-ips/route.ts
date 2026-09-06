import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertInternalRequest } from '@/lib/security';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    assertInternalRequest(req);

    const bannedIps = await prisma.bannedIP.findMany({
      select: { ip: true },
    });

    return NextResponse.json({
      ips: bannedIps.map((b) => b.ip),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ips: [] });
  }
}
