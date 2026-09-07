import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import { getFriendsData } from '@/app/actions/friends';
import FriendsClient from './FriendsClient';
import Link from 'next/link';

export const metadata = { title: 'Friends — Savepoint' };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const data = await getFriendsData();

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">Friends</h1>
            <p className="page-subtitle">Find people, accept requests, and open encrypted chats</p>
          </div>
          <Link href="/messages" className="btn btn-secondary">
            Messages
          </Link>
        </div>
        <FriendsClient incoming={data.incoming} outgoing={data.outgoing} friends={data.friends} />
      </main>
    </SessionProvider>
  );
}
