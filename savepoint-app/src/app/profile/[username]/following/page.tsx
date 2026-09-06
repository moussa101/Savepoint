import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import FollowButton from '@/components/ui/FollowButton';

async function getProfileUser(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      isPrivate: true,
    },
  });
}

async function canViewSocial(viewerId: string | undefined, profile: { id: string; isPrivate: boolean }) {
  if (!profile.isPrivate) return true;
  return !!viewerId && viewerId === profile.id;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username}'s Following — Savepoint` };
}

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();
  const profile = await getProfileUser(username);
  if (!profile) notFound();

  const allowed = await canViewSocial(session?.user?.id, profile);
  if (!allowed) {
    return (
      <SessionProvider>
        <Navbar />
        <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-2xl))' }}>
          <div className="container" style={{ maxWidth: 640 }}>
            <h1 className="page-title font-display">Following</h1>
            <p className="page-subtitle">This profile is private.</p>
          </div>
        </main>
      </SessionProvider>
    );
  }

  const following = await prisma.follow.findMany({
    where: { followerId: profile.id },
    include: {
      following: {
        select: { id: true, username: true, name: true, image: true, bio: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const followingIds = new Set<string>();
  if (session?.user?.id) {
    const mine = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    mine.forEach((f) => followingIds.add(f.followingId));
  }

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-2xl))' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <Link href={`/profile/${profile.username}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            ← Back to profile
          </Link>
          <h1 className="page-title font-display" style={{ marginTop: 'var(--space-md)' }}>
            {profile.name || profile.username} is Following
          </h1>
          <p className="page-subtitle">{following.length} following</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            {following.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Not following anyone yet</div>
              </div>
            ) : (
              following.map(({ following: user }) => (
                <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Link href={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                    <div className="avatar">
                      {user.image ? <img src={user.image} alt="" /> : (user.name || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{user.name || user.username}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>@{user.username}</div>
                      {user.bio && <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>{user.bio}</div>}
                    </div>
                  </Link>
                  {session?.user?.id && session.user.id !== user.id && (
                    <FollowButton
                      targetUserId={user.id}
                      isFollowing={followingIds.has(user.id)}
                      isLoggedIn
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </SessionProvider>
  );
}
