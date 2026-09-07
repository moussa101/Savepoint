-- AlterTable ForumTopic
ALTER TABLE "ForumTopic" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ForumTopic" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ForumTopic" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);

-- AlterTable ForumReply
ALTER TABLE "ForumReply" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "ForumReply" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "forumId" TEXT;

-- AlterTable DirectMessage
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'CHAT';
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "systemPayload" TEXT;
ALTER TABLE "DirectMessage" ALTER COLUMN "ciphertext" SET DEFAULT '';
ALTER TABLE "DirectMessage" ALTER COLUMN "iv" SET DEFAULT '';

CREATE TABLE IF NOT EXISTS "ForumTopicVote" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForumTopicVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ForumReplyVote" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForumReplyVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ForumTopicVote_topicId_userId_key" ON "ForumTopicVote"("topicId", "userId");
CREATE INDEX IF NOT EXISTS "ForumTopicVote_userId_idx" ON "ForumTopicVote"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ForumReplyVote_replyId_userId_key" ON "ForumReplyVote"("replyId", "userId");
CREATE INDEX IF NOT EXISTS "ForumReplyVote_userId_idx" ON "ForumReplyVote"("userId");

CREATE INDEX IF NOT EXISTS "ForumTopic_forumId_isPinned_createdAt_idx" ON "ForumTopic"("forumId", "isPinned", "createdAt");
CREATE INDEX IF NOT EXISTS "ForumTopic_forumId_score_idx" ON "ForumTopic"("forumId", "score");
CREATE INDEX IF NOT EXISTS "ForumReply_parentId_idx" ON "ForumReply"("parentId");
CREATE INDEX IF NOT EXISTS "Notification_forumId_idx" ON "Notification"("forumId");

DO $$ BEGIN
  ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ForumTopicVote" ADD CONSTRAINT "ForumTopicVote_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ForumTopicVote" ADD CONSTRAINT "ForumTopicVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ForumReplyVote" ADD CONSTRAINT "ForumReplyVote_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ForumReplyVote" ADD CONSTRAINT "ForumReplyVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE "User" SET "isOfficial" = true, "isVerified" = true WHERE lower("username") = 'savepoint';
