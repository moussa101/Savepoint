import { NextResponse } from 'next/server';
import {
  deleteEncryptedMessage,
  editEncryptedMessage,
  sendEncryptedMessage,
} from '@/app/actions/messages';

/**
 * Send/edit/delete via Route Handler so Server Actions don’t remount the chat RSC tree.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;

  let body: {
    action?: 'send' | 'edit' | 'delete';
    ciphertext?: string;
    iv?: string;
    kind?: 'CHAT' | 'MEDIA';
    messageId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action === 'delete') {
    if (!body.messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }
    const result = await deleteEncryptedMessage(body.messageId);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  const ciphertext = body.ciphertext || '';
  const iv = body.iv || '';

  if (body.action === 'edit') {
    if (!body.messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }
    const result = await editEncryptedMessage(body.messageId, ciphertext, iv);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  const result = await sendEncryptedMessage(
    conversationId,
    ciphertext,
    iv,
    body.kind === 'MEDIA' ? 'MEDIA' : 'CHAT'
  );
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
