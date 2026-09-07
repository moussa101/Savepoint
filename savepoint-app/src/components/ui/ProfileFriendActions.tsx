'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendFriendRequest } from '@/app/actions/friends';
import { openConversationWithFriend } from '@/app/actions/messages';
import { MessageIcon, PlusIcon } from '@/components/ui/Icons';

export default function ProfileFriendActions({
  targetUserId,
  relation,
}: {
  targetUserId: string;
  relation: 'none' | 'friends' | 'outgoing' | 'incoming';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (relation === 'friends') {
    return (
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await openConversationWithFriend(targetUserId);
            if (res.conversationId) router.push(`/messages/${res.conversationId}`);
          })
        }
      >
        <MessageIcon size={16} /> Message
      </button>
    );
  }

  if (relation === 'outgoing') {
    return <span className="btn btn-secondary" style={{ pointerEvents: 'none' }}>Request sent</span>;
  }

  if (relation === 'incoming') {
    return (
      <a href="/friends" className="btn btn-secondary">
        Respond on Friends
      </a>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await sendFriendRequest(targetUserId);
          router.refresh();
        })
      }
    >
      <PlusIcon size={16} /> Add friend
    </button>
  );
}
