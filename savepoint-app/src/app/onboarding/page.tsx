import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';
import OnboardingClient from './OnboardingClient';

export const metadata = {
  title: 'Welcome to Savepoint — Complete Your Profile',
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect('/login');
  
  if ((session.user as any).onboarded) {
    redirect('/feed');
  } else {
    // Fallback check against DB in case session token is stale
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (dbUser?.onboarded) {
      redirect('/feed');
    }
  }

  // Fetch ~30 highly popular games for the user to rate
  let popularGames = [];
  try {
    const query = `
      fields id, name, cover.image_id, total_rating_count;
      where total_rating_count > 500;
      sort total_rating_count desc;
      limit 30;
    `;
    const results = await fetchIGDB('games', query);
    popularGames = results.map((g: any) => ({
      id: g.id.toString(),
      name: g.name,
      coverUrl: getIGDBImageUrl(g.cover?.image_id, 'cover_big')
    }));
  } catch (err) {
    console.error('Failed to fetch onboarding games', err);
  }

  return (
    <main className="main-content" style={{ minHeight: '100dvh' }}>
      <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
        <div style={{ marginBottom: 'var(--space-lg)', maxWidth: 520 }}>
          <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
            Welcome{session.user.name ? `, ${session.user.name}` : ''}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.45 }}>
            Rate at least 5 games so we can personalize your feed.
          </p>
        </div>

        <OnboardingClient games={popularGames} />
      </div>
    </main>
  );
}
