import Link from 'next/link';
import { prisma } from '@/lib/db';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import { fetchIGDB, getIGDBImageUrl, IGDBGame } from '@/lib/igdb';

export default async function LandingPage() {
  let games: IGDBGame[] = [];
  try {
    games = await fetchIGDB(
      'games',
      `fields id, name, slug, cover.image_id, genres.name, total_rating;
       where total_rating_count > 100;
       sort total_rating_count desc;
       limit 12;`
    );
  } catch (err) {
    console.error(err);
  }

  const totalUsers = await prisma.user.count();
  const totalReviews = await prisma.review.count();

  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-bg">
            <div className="landing-hero-grid">
              {games.slice(0, 8).map((game) => {
                const coverUrl = getIGDBImageUrl(game.cover?.image_id, 'cover_big');
                return (
                  <div key={game.id} className="landing-hero-game">
                    {coverUrl && (
                      <img src={coverUrl} alt={game.name} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="landing-hero-overlay" />
          </div>
          <div className="landing-hero-content animate-fade-in-up">
            <h1 className="landing-hero-title font-display">
              Your Gaming Story,<br />Told Beautifully
            </h1>
            <p className="landing-hero-subtitle">
              Play. Rate. Review. Remember.
            </p>
            <div className="landing-hero-actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Start Your Journey
              </Link>
              <Link href="/games" className="btn btn-outline btn-lg">
                Browse Games
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features container">
          <h2 className="section-title font-display" style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            Features
          </h2>
          <div className="landing-features-grid">
            <div className="card card-glass landing-feature-card">
              <div className="landing-feature-icon">🎮</div>
              <h3 className="landing-feature-title">Track Your Games</h3>
              <p className="landing-feature-desc">
                Organize your gaming library with statuses — Playing, Completed, Want to Play, Dropped. Never lose track of your backlog again.
              </p>
            </div>
            <div className="card card-glass landing-feature-card">
              <div className="landing-feature-icon">⭐</div>
              <h3 className="landing-feature-title">Rate & Review</h3>
              <p className="landing-feature-desc">
                Share your thoughts with half-star precision. Write reviews, mark spoilers, and see what the community thinks.
              </p>
            </div>
            <div className="card card-glass landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Social Discovery</h3>
              <p className="landing-feature-desc">
                Follow gamers with great taste. Discover games through people you trust, not just algorithms.
              </p>
            </div>
          </div>
        </section>

        {/* Games Preview */}
        <section className="landing-games container">
          <div className="section-header">
            <h2 className="section-title font-display">Popular Games</h2>
            <Link href="/games" className="section-link">
              See All →
            </Link>
          </div>
          <div className="scroll-row">
            {games.map((game) => {
              const coverUrl = getIGDBImageUrl(game.cover?.image_id, 'cover_big');
              const normalizedRating = game.total_rating ? (game.total_rating / 100) * 5 : 0;
              return (
                <Link
                  href={`/games/${game.slug}`}
                  key={game.id}
                  className="landing-game-card"
                >
                  <div className="game-cover">
                    {coverUrl && <img src={coverUrl} alt={game.name} />}
                  </div>
                  <div className="landing-game-info">
                    <div className="landing-game-title">{game.name}</div>
                    {normalizedRating > 0 && (
                      <StarRating rating={normalizedRating} size="sm" />
                    )}
                    <div className="landing-game-genres">
                      {game.genres?.slice(0, 2).map((g) => (
                        <span key={g.id} className="pill" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Stats Bar */}
        <section className="landing-stats">
          <div className="landing-stats-inner container">
            <div className="landing-stat">
              <div className="landing-stat-value font-display">{totalUsers || '0'}+</div>
              <div className="landing-stat-label">Gamers</div>
            </div>
            <div className="landing-stats-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value font-display">{totalReviews || '0'}+</div>
              <div className="landing-stat-label">Reviews</div>
            </div>
            <div className="landing-stats-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value font-display">300k+</div>
              <div className="landing-stat-label">Games</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing-cta container" style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
          <h2 className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: 'var(--space-md)' }}>
            Ready to start your journey?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', maxWidth: '500px', margin: '0 auto var(--space-xl)' }}>
            Join Savepoint and build a gaming profile that represents your taste.
          </p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Create Your Account
          </Link>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--bg-surface-border)', padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <p>© 2026 Savepoint. Play. Rate. Review. Remember.</p>
        </footer>
      </main>

    </SessionProvider>
  );
}
