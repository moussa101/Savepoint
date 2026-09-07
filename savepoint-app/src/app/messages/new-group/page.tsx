import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import NewGroupForm from './NewGroupForm';

export const metadata = { title: 'New group — Savepoint' };

export default async function NewGroupPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as { isAdmin?: boolean }).isAdmin) redirect('/admin');

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">New group</h1>
            <p className="page-subtitle">Name it, add a photo, invite friends</p>
          </div>
          <Link href="/messages" className="btn btn-ghost">
            Back
          </Link>
        </div>
        <NewGroupForm />
      </main>
    </SessionProvider>
  );
}
