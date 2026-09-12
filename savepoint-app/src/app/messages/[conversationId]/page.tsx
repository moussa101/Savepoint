import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { getConversation } from '@/app/actions/messages';
import ChatThread from './ChatThread';

export const metadata = { title: 'Chat', robots: { index: false, follow: false } };

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

  const c = result.conversation;

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <ChatThread
          conversationId={c.id}
          myUserId={session.user.id}
          type={c.type}
          other={c.other}
          groupName={c.name}
          groupImageUrl={c.imageUrl}
          members={c.members}
          wrappedGroupKey={c.wrappedGroupKey}
          myRole={c.myRole}
          initialMessages={c.messages}
        />
      </main>
    </>
  );
}
