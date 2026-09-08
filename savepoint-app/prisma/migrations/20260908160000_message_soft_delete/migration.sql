-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
