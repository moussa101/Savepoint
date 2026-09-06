import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getClientIpFromHeaders } from '@/lib/security';

export async function touchLastIp(userId: string, ip?: string) {
  try {
    let resolved = ip;
    if (!resolved) {
      const h = await headers();
      resolved = getClientIpFromHeaders(h);
    }
    if (!resolved || resolved === 'Unknown') return;

    await prisma.user.update({
      where: { id: userId },
      data: { lastIp: resolved },
    });
  } catch {
    // Non-fatal
  }
}
