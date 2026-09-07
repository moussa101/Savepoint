'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voteReply, voteTopic, pinTopic } from '@/app/actions/forums';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PinIcon,
  ShareIcon,
} from '@/components/ui/Icons';
import ReportButton from '@/components/ui/ReportButton';

export function VoteButtons({
  kind,
  id,
  score,
  myVote,
}: {
  kind: 'topic' | 'reply';
  id: string;
  score: number;
  myVote: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localScore, setLocalScore] = useState(score);
  const [localVote, setLocalVote] = useState(myVote);

  function cast(next: 1 | -1) {
    startTransition(async () => {
      const prevVote = localVote;
      const prevScore = localScore;
      let nextVote: number | null = next;
      let delta: number = next;
      if (prevVote === next) {
        nextVote = null;
        delta = -next;
      } else if (prevVote != null) {
        delta = next - prevVote;
      }
      setLocalVote(nextVote);
      setLocalScore(prevScore + delta);

      const result =
        kind === 'topic' ? await voteTopic(id, next) : await voteReply(id, next);
      if ('error' in result) {
        setLocalVote(prevVote);
        setLocalScore(prevScore);
        return;
      }
      if (typeof result.score === 'number') setLocalScore(result.score);
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 36 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        aria-label="Upvote"
        onClick={() => cast(1)}
        style={{
          padding: 4,
          color: localVote === 1 ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
      >
        <ArrowUpIcon size={18} />
      </button>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>
        {localScore}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        aria-label="Downvote"
        onClick={() => cast(-1)}
        style={{
          padding: 4,
          color: localVote === -1 ? '#eb5757' : 'var(--text-muted)',
        }}
      >
        <ArrowDownIcon size={18} />
      </button>
    </div>
  );
}

export function ShareButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={share} title="Share">
      <ShareIcon size={14} /> {copied ? 'Copied' : 'Share'}
    </button>
  );
}

export function PinTopicButton({ topicId, isPinned }: { topicId: string; isPinned: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await pinTopic(topicId, !isPinned);
          router.refresh();
        });
      }}
    >
      <PinIcon size={14} /> {isPinned ? 'Unpin' : 'Pin'}
    </button>
  );
}

export function PostActionBar({
  sharePath,
  reportType,
  reportId,
  reportedUserId,
  pin,
}: {
  sharePath: string;
  reportType: 'FORUM_TOPIC' | 'FORUM_REPLY';
  reportId: string;
  reportedUserId: string;
  pin?: { topicId: string; isPinned: boolean };
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginTop: 8 }}>
      <ShareButton path={sharePath} />
      {pin && <PinTopicButton topicId={pin.topicId} isPinned={pin.isPinned} />}
      <ReportButton targetType={reportType} targetId={reportId} reportedUserId={reportedUserId} />
    </div>
  );
}
