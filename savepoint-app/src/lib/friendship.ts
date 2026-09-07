import { prisma } from '@/lib/db';

/** Ordered pair so (A,B) and (B,A) map to the same conversation. */
export function orderedUserPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
    select: { id: true },
  });
  return !!row;
}
