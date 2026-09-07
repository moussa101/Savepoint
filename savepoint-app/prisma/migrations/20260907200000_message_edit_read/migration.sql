-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill updatedAt from createdAt for existing rows
UPDATE "DirectMessage" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DirectMessage_conversationId_updatedAt_idx" ON "DirectMessage"("conversationId", "updatedAt");
