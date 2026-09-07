import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import { getConversation } from '@/app/actions/messages';
import ChatThread from './ChatThread';

export const metadata = { title: 'Chat — Savepoint' };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { conversationId } = await params;
  const result = await getConversation(conversationId);
  if (!result.success || !result.conversation) notFound();

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <ChatThread
          conversationId={result.conversation.id}
          myUserId={session.user.id}
          other={result.conversation.other}
          initialMessages={result.conversation.messages}
        />
      </main>
    </SessionProvider>
  );
}
