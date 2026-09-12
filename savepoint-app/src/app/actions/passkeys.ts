'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type PasskeyListItem = {
  credentialID: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
};

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export async function listPasskeys(): Promise<PasskeyListItem[]> {
  const userId = await requireUserId();
  const rows = await prisma.authenticator.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      credentialID: true,
      name: true,
      credentialDeviceType: true,
      credentialBackedUp: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    credentialID: r.credentialID,
    name: r.name,
    deviceType: r.credentialDeviceType,
    backedUp: r.credentialBackedUp,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function renamePasskey(credentialID: string, name: string) {
  const userId = await requireUserId();
  const trimmed = name.trim().slice(0, 64);
  if (!trimmed) return { error: 'Name is required.' };

  const result = await prisma.authenticator.updateMany({
    where: { userId, credentialID },
    data: { name: trimmed },
  });
  if (result.count === 0) return { error: 'Passkey not found.' };

  revalidatePath('/settings');
  return { success: true as const };
}

export async function deletePasskey(credentialID: string) {
  const userId = await requireUserId();
  const result = await prisma.authenticator.deleteMany({
    where: { userId, credentialID },
  });
  if (result.count === 0) return { error: 'Passkey not found.' };

  revalidatePath('/settings');
  return { success: true as const };
}
