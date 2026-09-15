import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { UserIcon, ShieldIcon } from '@/components/ui/Icons';
import SettingsForms from './SettingsForms';
import ConnectedLibraries from './ConnectedLibraries';
import { isXboxLibraryConfigured } from '@/lib/auth-providers';
import PasskeysManager from '@/components/settings/PasskeysManager';
import type { PasskeyListItem } from '@/app/actions/passkeys';

export const metadata = { title: 'Settings', robots: { index: false, follow: false } };
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
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">Settings</h1>
            <p className="page-subtitle">Manage your account preferences</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)', maxWidth: '800px' }}>
          <div className="card">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-lg)' }}>
              <UserIcon size={24} color="var(--accent-primary)" />
              Account Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="settings-row">
                <div className="settings-row-copy">
                  <span className="settings-row-meta" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 'var(--text-xs)' }}>Username</span>
                  <span className="settings-row-title" style={{ marginBottom: 0 }}>@{user.username}</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-copy">
                  <span className="settings-row-meta" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 'var(--text-xs)' }}>Email Address</span>
                  <span className="settings-row-title" style={{ marginBottom: 0 }}>{user.email}</span>
                </div>
              </div>
            </div>

            <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              To change your display name, bio, or avatars, visit your{' '}
              <Link href={`/profile/${user.username}`} style={{ color: 'var(--accent-primary)' }}>Profile Page</Link>
              {' '}and click &ldquo;Edit Profile&rdquo;.
            </p>
          </div>

          <div className="card">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-lg)' }}>
              <ShieldIcon size={24} color="var(--accent-primary)" />
              Security
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="settings-row">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Password</span>
                  <span className="settings-row-meta">Reset your login password via email</span>
                </div>
                <Link href="/forgot-password" className="btn btn-outline btn-sm">Change</Link>
              </div>
              <PasskeysManager initial={passkeys} />
            </div>
          </div>

          <ConnectedLibraries
            steamId={user.steamId}
            steamPersonaName={user.steamPersonaName}
            steamLinkedAt={user.steamLinkedAt}
            steamLastSyncAt={user.steamLastSyncAt}
            xboxGamertag={user.xboxGamertag}
            xboxLinkedAt={user.xboxLinkedAt}
            xboxLastSyncAt={user.xboxLastSyncAt}
            psnOnlineId={user.psnOnlineId}
            psnLinkedAt={user.psnLinkedAt}
            psnLastSyncAt={user.psnLastSyncAt}
            steamQuery={steamQuery ?? null}
            showXbox={isXboxLibraryConfigured()}
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
