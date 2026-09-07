import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CreateForumForm from './CreateForumForm';

export const metadata = { title: 'Create Forum — Savepoint' };

export default async function NewForumPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as { isAdmin?: boolean }).isAdmin) redirect('/admin/forums');

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">Create a forum</h1>
            <p className="page-subtitle">Start a community for help, tips, and discussion</p>
          </div>
          <Link href="/forums" className="btn btn-ghost">
            Back
          </Link>
        </div>
        <CreateForumForm />
      </main>
    </>
  );
}
