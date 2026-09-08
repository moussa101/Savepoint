import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  looksLikeKeyB64,
  openE2EPrivateKey,
  sealE2EPrivateKey,
} from '@/lib/e2e-key-backup';

/**
 * Messaging identity sync.
 * GET returns this account's public key + sealed private key (opened for the session).
 * PUT stores public key and optionally a private-key backup for multi-device restore.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { e2ePublicKey: true, e2ePrivateKeyBackup: true },
  });

  const privateKey =
    user?.e2ePrivateKeyBackup
      ? openE2EPrivateKey(session.user.id, user.e2ePrivateKeyBackup)
      : null;

  return NextResponse.json({
    publicKey: user?.e2ePublicKey ?? null,
    privateKey,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { publicKey?: string; privateKey?: string; clearPrivateBackup?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const publicKeyB64 = body.publicKey?.trim() || '';
  if (!looksLikeKeyB64(publicKeyB64, 80, 2000)) {
    return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
  }

  const data: {
    e2ePublicKey: string;
    e2ePublicKeyUpdatedAt: Date;
    e2ePrivateKeyBackup?: string | null;
  } = {
    e2ePublicKey: publicKeyB64,
    e2ePublicKeyUpdatedAt: new Date(),
  };

  const privateKeyB64 = body.privateKey?.trim() || '';
  if (privateKeyB64) {
    if (!looksLikeKeyB64(privateKeyB64, 80, 4000)) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 400 });
    }
    data.e2ePrivateKeyBackup = sealE2EPrivateKey(session.user.id, privateKeyB64);
  } else if (body.clearPrivateBackup) {
    // Avoid leaving a sealed private key that doesn't match this public key.
    data.e2ePrivateKeyBackup = null;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ success: true });
}
