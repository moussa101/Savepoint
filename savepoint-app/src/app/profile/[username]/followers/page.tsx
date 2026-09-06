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
  if (!viewerId) return false;
  if (viewerId === profile.id) return true;
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: profile.id,
      },
    },
  });
  return !!follow;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username}'s Followers — Savepoint` };
}

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
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
            <h1 className="page-title font-display">Followers</h1>
            <p className="page-subtitle">This profile is private.</p>
          </div>
        </main>
      </SessionProvider>
    );
  }

  const followers = await prisma.follow.findMany({
    where: { followingId: profile.id },
    include: {
      follower: {
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
            {profile.name || profile.username}&apos;s Followers
          </h1>
          <p className="page-subtitle">{followers.length} followers</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            {followers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No followers yet</div>
              </div>
            ) : (
              followers.map(({ follower }) => (
                <div key={follower.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Link href={`/profile/${follower.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                    <div className="avatar">
                      {follower.image ? <img src={follower.image} alt="" /> : (follower.name || follower.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{follower.name || follower.username}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>@{follower.username}</div>
                      {follower.bio && <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>{follower.bio}</div>}
                    </div>
                  </Link>
                  {session?.user?.id && session.user.id !== follower.id && (
                    <FollowButton
                      targetUserId={follower.id}
                      isFollowing={followingIds.has(follower.id)}
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
