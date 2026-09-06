'use client';

import { useState, useTransition } from 'react';
import StarRating from '@/components/ui/StarRating';
import { createReview, deleteReview, toggleReviewLike } from '@/app/actions/games';
import { formatRelativeTime } from '@/lib/utils';
import { EditIcon, PenToolIcon, HeartIcon, MessageIcon, AlertTriangleIcon, TrashIcon } from '@/components/ui/Icons';

interface ReviewData {
  id: string;
  userId: string;
  rating: number;
  text: string;
  containsSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; name: string | null; image: string | null };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isOwn: boolean;
}

interface ReviewSectionProps {
  gameId: string;
  reviews: ReviewData[];
  isLoggedIn: boolean;
  currentUserId: string | null;
}

export default function ReviewSection({ gameId, reviews: initialReviews, isLoggedIn, currentUserId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [spoilers, setSpoilers] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  const hasReviewed = reviews.some((r) => r.userId === currentUserId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('rating', reviewRating.toString());
    formData.set('containsSpoilers', spoilers.toString());

    startTransition(async () => {
      const result = await createReview(gameId, formData);
      if (result.success) {
        setShowForm(false);
        setReviewRating(0);
        setSpoilers(false);
        // Refresh will show the new review
        window.location.reload();
      }
    });
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('Delete this review?')) return;
    startTransition(async () => {
      await deleteReview(reviewId);
      setReviews(reviews.filter((r) => r.id !== reviewId));
    });
  }

  async function handleLike(reviewId: string) {
    startTransition(async () => {
      const result = await toggleReviewLike(reviewId);
      if (result.success) {
        setReviews(reviews.map((r) =>
          r.id === reviewId
            ? { ...r, isLiked: result.liked!, likeCount: r.likeCount + (result.liked ? 1 : -1) }
            : r
        ));
      }
    });
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          Reviews ({reviews.length})
        </h2>
        {isLoggedIn && !hasReviewed && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <EditIcon size={16} /> Write a Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ background: 'var(--bg-surface-hover)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Your Rating</label>
            <StarRating rating={reviewRating} size="lg" interactive onRate={setReviewRating} />
          </div>
          <div className="form-group">
            <textarea name="text" className="textarea" placeholder="Write your review..." required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
              <input
                type="checkbox"
                checked={spoilers}
                onChange={(e) => setSpoilers(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              Contains spoilers
            </label>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" disabled={isPending || reviewRating === 0}>
              {isPending ? 'Publishing...' : 'Publish Review'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><PenToolIcon size={48} color="var(--text-muted)" /></div>
          <div className="empty-state-title">No reviews yet</div>
          <div className="empty-state-text">Be the first to share your thoughts about this game.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {reviews.map((review) => {
            const isSpoilerRevealed = revealedSpoilers.has(review.id);

            return (
              <div key={review.id} className="card" style={{ background: 'var(--bg-surface-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div className="avatar">
                      {review.user.image ? (
                        <img src={review.user.image} alt={review.user.name || ''} />
                      ) : (
                        (review.user.name || review.user.username).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <a href={`/profile/${review.user.username}`} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {review.user.name || review.user.username}
                      </a>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {formatRelativeTime(review.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {review.containsSpoilers && (
                      <span className="badge badge-spoiler"><AlertTriangleIcon size={14} /> Spoilers</span>
                    )}
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                </div>

                {review.containsSpoilers && !isSpoilerRevealed ? (
                  <div style={{ position: 'relative' }}>
                    <div className="spoiler-hidden">
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                        {review.text}
                      </p>
                    </div>
                    <button
                      className="spoiler-reveal-btn"
                      onClick={() => setRevealedSpoilers(new Set([...revealedSpoilers, review.id]))}
                    >
                      <AlertTriangleIcon size={16} /> Contains spoilers — click to reveal
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                    {review.text}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleLike(review.id)}
                    style={{ color: review.isLiked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                    disabled={!isLoggedIn || review.isOwn}
                  >
                    <HeartIcon size={16} filled={review.isLiked} /> {review.likeCount}
                  </button>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageIcon size={16} /> {review.commentCount}
                  </span>
                  {review.isOwn && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(review.id)}
                      style={{ color: 'var(--danger)', marginLeft: 'auto' }}
                    >
                      <TrashIcon size={16} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
