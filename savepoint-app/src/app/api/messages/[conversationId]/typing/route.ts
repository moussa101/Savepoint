import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clearTyping, setTyping } from '@/lib/typing-store';

/**
 * POST /api/messages/[conversationId]/typing
 * Body: { typing: boolean }
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
  const username = session.user.username || session.user.name || 'Someone';
  const { conversationId } = await context.params;

  let body: { typing?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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

  if (body.typing) {
    setTyping(conversationId, userId, username);
  } else {
    clearTyping(conversationId, userId);
  }

  return NextResponse.json({ success: true });
}
