'use client';

import { useState, useTransition } from 'react';
import { HeartIcon, MessageIcon, TrashIcon } from '@/components/ui/Icons';
import { toggleActivityLike, createActivityComment, deleteActivityComment } from '@/app/actions/activities';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityComment {
  id: string;
  text: string;
  createdAt: string | Date;
  userId: string;
  user: {
    username: string;
    name: string | null;
    image: string | null;
  };
}

interface ActivityActionBarProps {
  activityId: string;
  initialLikes: number;
  initialHasLiked: boolean;
  comments: ActivityComment[];
  isLoggedIn: boolean;
  currentUserId?: string | null;
}

export default function ActivityActionBar({
  activityId,
  initialLikes,
  initialHasLiked,
  comments: initialComments,
  isLoggedIn,
  currentUserId,
}: ActivityActionBarProps) {
  const [isLiked, setIsLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleLike = async () => {
    if (!isLoggedIn || isPending) return;

    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    startTransition(async () => {
      try {
        await toggleActivityLike(activityId);
      } catch {
        setIsLiked(isLiked);
        setLikesCount(initialLikes);
      }
    });
  };

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !isLoggedIn) return;
    startTransition(async () => {
      const result = await createActivityComment(activityId, text);
      if (result.success && result.comment) {
        setComments((prev) => [...prev, result.comment as ActivityComment]);
        setText('');
        setShowComments(true);
      }
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteActivityComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--bg-surface-elevated)' }}>
        <button
          onClick={handleLike}
          disabled={isPending || !isLoggedIn}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            background: 'none',
            border: 'none',
            color: isLiked ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: (!isLoggedIn || isPending) ? 'default' : 'pointer',
            padding: 'var(--space-xs)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            opacity: (!isLoggedIn) ? 0.5 : 1,
          }}
        >
          <HeartIcon size={18} filled={isLiked} color={isLiked ? 'var(--accent-primary)' : 'currentColor'} />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 'var(--space-xs)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}
        >
          <MessageIcon size={18} />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <div className="avatar avatar-sm">
                {comment.user.image ? <img src={comment.user.image} alt="" /> : (comment.user.name || comment.user.username).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                  <div>
                    <a href={`/profile/${comment.user.username}`} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {comment.user.name || comment.user.username}
                    </a>
                    <span style={{ marginLeft: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  {currentUserId === comment.userId && (
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(comment.id)} style={{ color: 'var(--danger)', padding: 2 }}>
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{comment.text}</p>
              </div>
            </div>
          ))}

          {isLoggedIn ? (
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <input
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment..."
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" disabled={isPending || !text.trim()}>
                Post
              </button>
            </form>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Sign in to comment</p>
          )}
        </div>
      )}
    </div>
  );
}
