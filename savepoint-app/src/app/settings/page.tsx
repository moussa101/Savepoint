import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { UserIcon, ShieldIcon } from '@/components/ui/Icons';
import SettingsForms from './SettingsForms';
import ConnectedLibraries from './ConnectedLibraries';
import PasskeysManager from '@/components/settings/PasskeysManager';
import type { PasskeyListItem } from '@/app/actions/passkeys';

export const metadata = { title: 'Settings — Savepoint' };
// Library syncs (Steam / PSN trophies) can take longer than the default serverless limit.
export const maxDuration = 180;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ steam?: string }>;
}) {
  const [session, { steam: steamQuery }] = await Promise.all([auth(), searchParams]);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      authenticators: {
        orderBy: { createdAt: 'desc' },
        select: {
          credentialID: true,
          name: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) redirect('/login');
  if (user.isAdmin) redirect('/admin/settings');

  const passkeys: PasskeyListItem[] = user.authenticators.map((a) => ({
    credentialID: a.credentialID,
    name: a.name,
    deviceType: a.credentialDeviceType,
    backedUp: a.credentialBackedUp,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <>
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
              To change your display name, bio, or avatars, visit your{' '}
              <Link href={`/profile/${user.username}`} style={{ color: 'var(--accent-primary)' }}>Profile Page</Link>
              {' '}and click &ldquo;Edit Profile&rdquo;.
            </p>
          </div>

          <div className="card">
            <h2 className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              <ShieldIcon size={24} color="var(--accent-primary)" />
              Security
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Password</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Reset your login password via email</span>
                </div>
                <Link href="/forgot-password" className="btn btn-outline btn-sm">Change</Link>
              </div>
              <PasskeysManager initial={passkeys} />
            </div>
          </div>

          <ConnectedLibraries
            steamId={user.steamId}
            steamLinkedAt={user.steamLinkedAt}
            steamLastSyncAt={user.steamLastSyncAt}
            xboxGamertag={user.xboxGamertag}
            xboxLinkedAt={user.xboxLinkedAt}
            xboxLastSyncAt={user.xboxLastSyncAt}
            psnOnlineId={user.psnOnlineId}
            psnLinkedAt={user.psnLinkedAt}
            psnLastSyncAt={user.psnLastSyncAt}
            steamQuery={steamQuery ?? null}
          />

          <SettingsForms
            isPrivate={user.isPrivate}
            libraryPublic={user.libraryPublic}
            notifyOnFollow={user.notifyOnFollow}
            notifyOnReviewLike={user.notifyOnReviewLike}
            notifyOnComment={user.notifyOnComment}
            notifyOnListLike={user.notifyOnListLike}
            notifyOnGameRelease={user.notifyOnGameRelease}
            notifyOnMessage={user.notifyOnMessage}
            emailOnMessage={user.emailOnMessage}
          />
        </div>
      </main>
    </>
  );
}
