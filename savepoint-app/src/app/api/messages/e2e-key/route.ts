import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * E2E key sync via Route Handler (not a Server Action) so opening a chat
 * does not trigger a full RSC refresh / remount of the conversation page.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { e2ePublicKey: true },
  });

  return NextResponse.json({ publicKey: user?.e2ePublicKey ?? null });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { publicKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const publicKeyB64 = body.publicKey?.trim() || '';
  if (!publicKeyB64 || publicKeyB64.length < 80 || publicKeyB64.length > 2000) {
    return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { e2ePublicKey: publicKeyB64, e2ePublicKeyUpdatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
