import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin Settings — Savepoint' };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || !(session.user as any).isAdmin) redirect('/login');

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Admin preferences and system settings</p>
      </div>
      
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>
          System configuration options will be available here soon.
        </p>
      </div>
    </div>
  );
}
