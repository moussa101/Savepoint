'use client';

import { useState, useTransition } from 'react';
import { followUser, unfollowUser } from '@/app/actions/social';
import { CheckCircleIcon, UsersIcon } from '@/components/ui/Icons';

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
  isLoggedIn: boolean;
}

export default function FollowButton({ targetUserId, isFollowing: initialIsFollowing, isLoggedIn }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  if (!isLoggedIn) {
    return (
      <a href="/login" className="btn btn-primary btn-sm">
        <UsersIcon size={16} /> Follow
      </a>
    );
  }

  function handleFollowToggle() {
    startTransition(async () => {
      // Optimistic update
      setIsFollowing(!isFollowing);
      
      const result = isFollowing 
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);
        
      if (result.error) {
        // Revert on error
        setIsFollowing(isFollowing);
      }
    });
  }

  if (isFollowing) {
    return (
      <button 
        className={`btn btn-sm ${isHovered ? 'btn-danger' : 'btn-outline'}`}
        onClick={handleFollowToggle}
        disabled={isPending}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={isHovered ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}}
      >
        {isHovered ? 'Unfollow' : <><CheckCircleIcon size={16} /> Following</>}
      </button>
    );
  }

  return (
    <button 
      className="btn btn-primary btn-sm"
      onClick={handleFollowToggle}
      disabled={isPending}
    >
      <UsersIcon size={16} /> Follow
    </button>
  );
}
