'use client';

import { useState, useTransition } from 'react';
import { HeartIcon } from '@/components/ui/Icons';
import { toggleListLike } from '@/app/actions/lists';

interface ListLikeButtonProps {
  listId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  isLoggedIn: boolean;
}

export default function ListLikeButton({ listId, initialLiked, initialLikeCount, isLoggedIn }: ListLikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const handleLike = async () => {
    if (!isLoggedIn) return; // Wait for UI to redirect or handle it

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => (isLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleListLike(listId, isLiked);
      if (result.error) {
        // Revert on error
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    });
  };

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={handleLike}
      disabled={isPending || !isLoggedIn}
      style={{
        color: isLiked ? 'var(--accent-primary)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }}
    >
      <HeartIcon size={18} filled={isLiked} />
      <span>{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
    </button>
  );
}
