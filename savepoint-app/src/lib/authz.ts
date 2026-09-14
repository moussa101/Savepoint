import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { forbidden, unauthorized } from 'next/navigation';

export async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    unauthorized();
    throw new Error('Unauthorized');
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isBanned: true },
  });

  if (!admin?.isAdmin || admin.isBanned) {
    forbidden();
    throw new Error('Forbidden');
  }

  return session;
}
