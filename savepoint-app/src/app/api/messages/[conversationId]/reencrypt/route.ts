import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const MAX_BATCH = 40;
const MAX_CIPHERTEXT = 200_000;

/**
 * Batch ciphertext rewrite for multi-device key migration.
 * Any conversation member may update opaque ciphertext (not plaintext).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { conversationId } = await context.params;

  let body: { updates?: { id?: string; ciphertext?: string; iv?: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates = (body.updates || [])
    .map((u) => ({
      id: (u.id || '').trim(),
      ciphertext: (u.ciphertext || '').trim(),
      iv: (u.iv || '').trim(),
    }))
    .filter((u) => u.id && u.ciphertext && u.iv);

  if (!updates.length || updates.length > MAX_BATCH) {
    return NextResponse.json({ error: 'Invalid batch' }, { status: 400 });
  }
  if (updates.some((u) => u.ciphertext.length > MAX_CIPHERTEXT || u.iv.length > 200)) {
    return NextResponse.json({ error: 'Invalid payload size' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      type: true,
      userOneId: true,
      userTwoId: true,
      members: { where: { userId }, select: { id: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const allowed =
    conversation.type === 'GROUP'
      ? conversation.members.length > 0
      : conversation.userOneId === userId || conversation.userTwoId === userId;

  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ids = updates.map((u) => u.id);
  const existing = await prisma.directMessage.findMany({
    where: {
      conversationId,
      id: { in: ids },
      kind: { in: ['CHAT', 'MEDIA'] },
    },
    select: { id: true },
  });
  const allowedIds = new Set(existing.map((m) => m.id));
  const apply = updates.filter((u) => allowedIds.has(u.id));
  if (!apply.length) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  await prisma.$transaction(
    apply.map((u) =>
      prisma.directMessage.update({
        where: { id: u.id },
        data: { ciphertext: u.ciphertext, iv: u.iv },
      })
    )
  );

  return NextResponse.json({ success: true, updated: apply.length });
}
