'use client';

import { useState } from 'react';
import ForumBody from '@/components/forum/ForumBody';
import ForumAuthorRow from '@/components/forum/ForumAuthorRow';
import { PostActionBar, VoteButtons } from '@/components/forum/ForumPostActions';
import { formatRelativeTime } from '@/lib/utils';
import { ReplyForm } from './TopicActions';

type Author = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  isVerified: boolean;
  isOfficial: boolean;
};

export type ReplyNode = {
  id: string;
  body: string;
  imageUrls: string[];
  score: number;
  createdAt: Date | string;
  authorId: string;
  parentId: string | null;
  author: Author;
  myVote: number | null;
  children: ReplyNode[];
};

export function ReplyTree({
  replies,
  topicId,
  forumSlug,
  canReply,
  depth = 0,
}: {
  replies: ReplyNode[];
  topicId: string;
  forumSlug: string;
  canReply: boolean;
  depth?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {replies.map((reply) => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          topicId={topicId}
          forumSlug={forumSlug}
          canReply={canReply}
          depth={depth}
        />
      ))}
    </div>
  );
}

function ReplyCard({
  reply,
  topicId,
  forumSlug,
  canReply,
  depth,
}: {
  reply: ReplyNode;
  topicId: string;
  forumSlug: string;
  canReply: boolean;
  depth: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const sharePath = `/forums/${forumSlug}/${topicId}#reply-${reply.id}`;

  return (
    <article
      id={`reply-${reply.id}`}
      className="card"
      style={{
        padding: 'var(--space-lg)',
        marginLeft: depth > 0 ? Math.min(depth * 16, 48) : 0,
        borderLeft: depth > 0 ? '2px solid var(--bg-surface-border)' : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <VoteButtons kind="reply" id={reply.id} score={reply.score} myVote={reply.myVote} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <ForumAuthorRow author={reply.author} subtitle={formatRelativeTime(new Date(reply.createdAt))} />
          <div style={{ marginTop: 12 }}>
            <ForumBody text={reply.body} />
          </div>
          {reply.imageUrls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {reply.imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: 'cover' }} />
                </a>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <PostActionBar
              sharePath={sharePath}
              reportType="FORUM_REPLY"
              reportId={reply.id}
              reportedUserId={reply.authorId}
            />
            {canReply && depth < 2 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReply((v) => !v)}>
                Comment
              </button>
            )}
          </div>
          {showReply && (
            <ReplyForm
              topicId={topicId}
              parentId={reply.id}
              compact
              onDone={() => setShowReply(false)}
            />
          )}
          {reply.children.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <ReplyTree
                replies={reply.children}
                topicId={topicId}
                forumSlug={forumSlug}
                canReply={canReply}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
