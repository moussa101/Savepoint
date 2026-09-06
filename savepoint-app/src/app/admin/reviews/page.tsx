import { prisma } from '@/lib/db';
import ReviewModerationList from './ReviewModerationList';

export const metadata = {
  title: 'Review Moderation — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      game: { select: { name: true, slug: true } }
    }
  });

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>Review Moderation</h1>
        <p style={{ color: 'var(--text-muted)' }}>Monitor and moderate user reviews</p>
      </div>
      
      <ReviewModerationList reviews={reviews} />
    </div>
  );
}
