-- AlterTable Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Conversation" ALTER COLUMN "userOneId" DROP NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "userTwoId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Conversation_type_lastMessageAt_idx" ON "Conversation"("type", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_createdById_idx" ON "Conversation"("createdById");

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "ConversationMember_userId_idx" ON "ConversationMember"("userId");

DO $$ BEGIN
  ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GroupKeyWrap" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupKeyWrap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupKeyWrap_conversationId_userId_key" ON "GroupKeyWrap"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "GroupKeyWrap_userId_idx" ON "GroupKeyWrap"("userId");

DO $$ BEGIN
  ALTER TABLE "GroupKeyWrap" ADD CONSTRAINT "GroupKeyWrap_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupKeyWrap" ADD CONSTRAINT "GroupKeyWrap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
