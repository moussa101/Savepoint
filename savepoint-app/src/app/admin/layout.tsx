import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import SessionProvider from '@/components/SessionProvider';
import { LogOutIcon, UsersIcon, ActivityIcon, SettingsIcon, ShieldIcon, AlertTriangleIcon, ForumIcon } from '@/components/ui/Icons';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isBanned: true },
  });

  if (!dbUser?.isAdmin || dbUser.isBanned) {
    redirect('/');
  }

  return (
    <SessionProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-background)' }}>
        <aside style={{
          width: '260px',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--bg-surface-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40
        }}>
          <div style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--bg-surface-border)' }}>
            <Link href="/admin" className="navbar-brand" style={{ margin: 0 }}>
              <span className="navbar-brand-icon">⟐</span>
              Admin
            </Link>
          </div>

          <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flex: 1 }}>
            <Link href="/admin" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <ActivityIcon size={18} />
              Dashboard
            </Link>
            <Link href="/admin/users" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <UsersIcon size={18} />
              Users
            </Link>
            <Link href="/admin/reviews" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <ShieldIcon size={18} />
              Reviews
            </Link>
            <Link href="/admin/reports" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <AlertTriangleIcon size={18} />
              Reports
            </Link>
            <Link href="/admin/forums" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <ForumIcon size={18} />
              Forums
            </Link>
            <Link href="/admin/settings" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-md)' }}>
              <SettingsIcon size={18} />
              Settings
            </Link>
          </div>

          <div style={{ padding: 'var(--space-xl)', borderTop: '1px solid var(--bg-surface-border)' }}>
            <Link href="/" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              <LogOutIcon size={18} />
              Exit Admin
            </Link>
          </div>
        </aside>

        <main style={{ flex: 1, backgroundColor: 'var(--bg-background)' }}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
