import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { listConversations } from '@/app/actions/messages';
import MessagesInbox from './MessagesInbox';

export const metadata = { title: 'Messages', robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const conversations = await listConversations();

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">Messages</h1>
            <p className="page-subtitle">End-to-end encrypted chats with friends</p>
          </div>
          <Link href="/friends" className="btn btn-secondary">
            Friends
          </Link>
        </div>
        <MessagesInbox conversations={conversations} userId={session.user.id} />
      </main>
    </>
  );
}
