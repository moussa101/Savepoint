'use client';

import { useState, useTransition } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { TrashIcon, MessageIcon, HeartIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';
import { createComment, deleteComment } from '@/app/actions/games';
import { toggleCommentLike } from '@/app/actions/activities';
import ReportButton from '@/components/ui/ReportButton';

export interface CommentData {
  id: string;
  text: string;
  createdAt: string | Date;
  userId: string;
  likeCount?: number;
  likedByMe?: boolean;
  user: {
    username: string;
    name: string | null;
    image: string | null;
  };
}

interface ReviewCommentsProps {
  reviewId: string;
  comments: CommentData[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  reviewOwnerId: string;
}

export default function ReviewComments({ reviewId, comments: initialComments, isLoggedIn, currentUserId, reviewOwnerId }: ReviewCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    startTransition(async () => {
      const result = await createComment(reviewId, newComment);
      if (result.success) {
        setNewComment('');
        window.location.reload();
      }
    });
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    startTransition(async () => {
      await deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    });
  }

  function handleLikeComment(commentId: string) {
    if (!isLoggedIn) return;
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c;
      const liked = !!c.likedByMe;
      return {
        ...c,
        likedByMe: !liked,
        likeCount: Math.max(0, (c.likeCount || 0) + (liked ? -1 : 1)),
      };
    }));
    startTransition(async () => {
      await toggleCommentLike(commentId);
    });
  }

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ color: 'var(--text-muted)' }}
      >
        <MessageIcon size={16} />
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </button>

      {isOpen && (
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
          {comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {comments.map(comment => {
                const canDelete = currentUserId === comment.userId || currentUserId === reviewOwnerId;
                const isOwn = currentUserId === comment.userId;

                return (
                  <div key={comment.id} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <UserAvatar
                      className="avatar avatar-sm"
                      style={{ flexShrink: 0 }}
                      src={comment.user.image}
                      name={comment.user.name}
                      username={comment.user.username}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <a href={`/profile/${comment.user.username}`} style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            {comment.user.name || comment.user.username}
                          </a>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-sm)' }}>
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {canDelete && (
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ padding: '4px', height: 'auto', minHeight: 'auto', color: 'var(--danger)' }}
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {comment.text}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={!isLoggedIn || isOwn || isPending}
                          onClick={() => handleLikeComment(comment.id)}
                          style={{ color: comment.likedByMe ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 6px' }}
                        >
                          <HeartIcon size={14} filled={!!comment.likedByMe} /> {comment.likeCount || 0}
                        </button>
                        {isLoggedIn && !isOwn && (
                          <ReportButton targetType="COMMENT" targetId={comment.id} reportedUserId={comment.userId} label="Report" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-sm) 0' }}>
              No comments yet. Be the first to reply!
            </div>
          )}

          {isLoggedIn && (
            <form onSubmit={handlePostComment} style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
              <input
                type="text"
                className="input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={isPending || !newComment.trim()}>
                {isPending ? '...' : 'Post'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
