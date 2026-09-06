import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/SessionProvider';
import StarRating from '@/components/ui/StarRating';
import DiaryForm from './DiaryForm';
import { formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { GameStatus } from '@/lib/utils';

export const metadata = { title: 'Gaming Diary — Savepoint' };

export default async function DiaryPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const entries = await prisma.diaryEntry.findMany({
    where: { userId: session.user.id },
    include: { game: true },
    orderBy: { date: 'desc' },
  });

  // Group entries by month
  const grouped: Record<string, typeof entries> = {};
  entries.forEach((entry) => {
    const key = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  // Stats
  const thisMonth = new Date();
  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const completedThisMonth = thisMonthEntries.filter((e) => e.status === 'COMPLETED').length;
  const ratingsThisMonth = thisMonthEntries.filter((e) => e.rating);
  const avgThisMonth = ratingsThisMonth.length > 0
    ? ratingsThisMonth.reduce((sum, e) => sum + (e.rating || 0), 0) / ratingsThisMonth.length
    : 0;

  // Games for form
  const games = await prisma.game.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <SessionProvider>
      <Navbar />
      <Sidebar />
      <main className="main-with-sidebar">
        <div className="page-header">
          <div>
            <h1 className="page-title font-display">My Gaming Diary</h1>
            <p className="page-subtitle">Your personal gaming timeline</p>
          </div>
          <DiaryForm games={games} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-xl)' }}>
          {/* Timeline */}
          <div>
            {Object.keys(grouped).length === 0 ? (
              <div className="empty-state card">
                <div className="empty-state-icon">📖</div>
                <div className="empty-state-title">No diary entries yet</div>
                <div className="empty-state-text">Start logging your gaming sessions to build your timeline.</div>
              </div>
            ) : (
              Object.entries(grouped).map(([month, monthEntries]) => (
                <div key={month} style={{ marginBottom: 'var(--space-2xl)' }}>
                  <h2
                    className="font-display"
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      marginBottom: 'var(--space-lg)',
                      paddingBottom: 'var(--space-sm)',
                      borderBottom: '2px solid var(--accent-primary)',
                      display: 'inline-block',
                    }}
                  >
                    {month}
                  </h2>
                  <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {monthEntries.map((entry) => (
                      <div key={entry.id} style={{ position: 'relative' }}>
                        <div className="timeline-dot" />
                        <div className="card" style={{ marginLeft: 'var(--space-md)' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Link href={`/games/${entry.game.slug}`}>
                              <div className="game-cover" style={{ width: '70px', height: '93px', flexShrink: 0 }}>
                                {entry.game.coverImage && <img src={entry.game.coverImage} alt={entry.game.name} />}
                              </div>
                            </Link>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                {formatDate(entry.date)}
                              </div>
                              <Link href={`/games/${entry.game.slug}`} style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                                {entry.game.name}
                              </Link>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                                {entry.status && (
                                  <span className={`badge badge-${STATUS_COLORS[entry.status as GameStatus]}`}>
                                    {STATUS_LABELS[entry.status as GameStatus]}
                                  </span>
                                )}
                                {entry.rating && <StarRating rating={entry.rating} size="sm" />}
                              </div>
                              {entry.notes && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-sm)', lineHeight: 'var(--leading-relaxed)' }}>
                                  &ldquo;{entry.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats Sidebar */}
          <div>
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                Diary Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Logged this month</span>
                  <span className="font-display" style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>{thisMonthEntries.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Completed this month</span>
                  <span className="font-display" style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>{completedThisMonth}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Avg rating this month</span>
                  <span className="font-display" style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>{avgThisMonth > 0 ? avgThisMonth.toFixed(1) : '—'}</span>
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                Total Entries
              </h3>
              <div className="font-display" style={{ fontSize: 'var(--text-4xl)', fontWeight: 900, color: 'var(--accent-primary)' }}>
                {entries.length}
              </div>
            </div>
          </div>
        </div>
      </main>
    </SessionProvider>
  );
}
