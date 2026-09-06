'use client';

import { useState, useTransition } from 'react';
import { toggleFollow } from '@/app/actions/games';

export default function FollowButton({ targetUserId, initialFollowing }: { targetUserId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setFollowing(!following);
    startTransition(async () => {
      const result = await toggleFollow(targetUserId);
      if (result.success) {
        setFollowing(result.following!);
      }
    });
  }

  return (
    <button
      className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
      onClick={handleClick}
      disabled={isPending}
    >
      {following ? 'Following ✓' : 'Follow'}
    </button>
  );
}
