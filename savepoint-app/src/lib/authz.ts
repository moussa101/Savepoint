import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Admin access required');
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isBanned: true },
  });

  if (!admin?.isAdmin || admin.isBanned) {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
}
