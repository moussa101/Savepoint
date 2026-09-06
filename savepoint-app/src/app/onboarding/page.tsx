import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';
import OnboardingClient from './OnboardingClient';

export const metadata = {
  title: 'Welcome to Savepoint — Complete Your Profile',
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).onboarded) redirect('/feed');

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
    <main className="main-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ paddingTop: 'var(--space-3xl)', paddingBottom: 'var(--space-2xl)', flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 className="font-display" style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-sm)' }}>
            Welcome to Savepoint, {session.user.name}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            To personalize your experience and generate AI recommendations, tell us about your taste. <br/>
            <strong>Like or Dislike at least 5 games to continue.</strong>
          </p>
        </div>

        <OnboardingClient games={popularGames} />
      </div>
    </main>
  );
}
