'use client';

import { useState } from 'react';
import { HeartIcon, MessageIcon } from '@/components/ui/Icons';
import { toggleActivityLike } from '@/app/actions/activities';
import Link from 'next/link';

interface ActivityActionBarProps {
  activityId: string;
  initialLikes: number;
  initialHasLiked: boolean;
  commentsCount: number;
  isLoggedIn: boolean;
}

export default function ActivityActionBar({
  activityId,
  initialLikes,
  initialHasLiked,
  commentsCount,
  isLoggedIn,
}: ActivityActionBarProps) {
  const [isLiked, setIsLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isPending, setIsPending] = useState(false);

  const handleLike = async () => {
    if (!isLoggedIn || isPending) return;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsPending(true);
    
    try {
      await toggleActivityLike(activityId);
    } catch (e) {
      // Revert on failure
      setIsLiked(isLiked);
      setLikesCount(initialLikes);
    } finally {
      setIsPending(false);
    }
  };

  return (
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
          transition: 'color 0.2s ease, transform 0.1s ease',
          opacity: (!isLoggedIn) ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (isLoggedIn && !isPending && !isLiked) e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (isLoggedIn && !isPending && !isLiked) e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <HeartIcon size={18} filled={isLiked} color={isLiked ? 'var(--accent-primary)' : 'currentColor'} />
        {likesCount > 0 && <span>{likesCount}</span>}
      </button>

      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xs)',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer', // In the future, this could open a modal or expand comments
          padding: 'var(--space-xs)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <MessageIcon size={18} />
        {commentsCount > 0 && <span>{commentsCount}</span>}
      </button>
    </div>
  );
}
