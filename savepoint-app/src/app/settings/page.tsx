import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import { UserIcon, ShieldIcon, CogIcon } from '@/components/ui/Icons';
import Link from 'next/link';

export const metadata = { title: 'Settings — Savepoint' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect('/login');
  if (user.isAdmin) redirect('/admin/settings');

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h1 className="page-title font-display">Settings</h1>
            <p className="page-subtitle">Manage your account preferences</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)', maxWidth: '800px' }}>
          
          {/* Account Card */}
          <div className="card">
            <h2 className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              <UserIcon size={24} color="var(--accent-primary)" />
              Account Details
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Username</span>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>@{user.username}</span>
              </div>
              
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email Address</span>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{user.email}</span>
              </div>
            </div>

            <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              To change your display name, bio, or avatars, please visit your <Link href={`/profile/${user.username}`} style={{ color: 'var(--accent-primary)' }}>Profile Page</Link> and click &ldquo;Edit Profile&rdquo;.
            </p>
          </div>

          {/* Privacy Card */}
          <div className="card">
            <h2 className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              <ShieldIcon size={24} color="var(--accent-primary)" />
              Privacy & Security
            </h2>
            
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Password</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Manage your login password</span>
              </div>
              <button className="btn btn-outline btn-sm">Change</button>
            </div>
            
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Account Status</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Your profile and lists are currently visible</span>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </SessionProvider>
  );
}
