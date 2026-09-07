-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnOnlineId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnLinkedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnLastSyncAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnTrophyLevel" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnTrophyTier" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnTrophyProgress" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnEarnedBronze" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnEarnedSilver" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnEarnedGold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "psnEarnedPlatinum" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_psnAccountId_key" ON "User"("psnAccountId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "PsnTitleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT,
    "npCommunicationId" TEXT NOT NULL,
    "npServiceName" TEXT NOT NULL DEFAULT 'trophy',
    "titleName" TEXT NOT NULL,
    "platform" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "earnedBronze" INTEGER NOT NULL DEFAULT 0,
    "earnedSilver" INTEGER NOT NULL DEFAULT 0,
    "earnedGold" INTEGER NOT NULL DEFAULT 0,
    "earnedPlatinum" INTEGER NOT NULL DEFAULT 0,
    "definedBronze" INTEGER NOT NULL DEFAULT 0,
    "definedSilver" INTEGER NOT NULL DEFAULT 0,
    "definedGold" INTEGER NOT NULL DEFAULT 0,
    "definedPlatinum" INTEGER NOT NULL DEFAULT 0,
    "iconUrl" TEXT,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsnTitleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PsnTrophy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "npCommunicationId" TEXT NOT NULL,
    "trophyId" INTEGER NOT NULL,
    "trophyName" TEXT NOT NULL,
    "trophyDetail" TEXT,
    "trophyType" TEXT NOT NULL,
    "trophyIconUrl" TEXT,
    "trophyGroupId" TEXT,
    "earned" BOOLEAN NOT NULL DEFAULT false,
    "earnedDateTime" TIMESTAMP(3),
    "rarity" INTEGER,
    "earnedRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsnTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PsnTitleProgress_userId_npCommunicationId_key" ON "PsnTitleProgress"("userId", "npCommunicationId");
CREATE INDEX IF NOT EXISTS "PsnTitleProgress_userId_gameId_idx" ON "PsnTitleProgress"("userId", "gameId");
CREATE INDEX IF NOT EXISTS "PsnTitleProgress_gameId_idx" ON "PsnTitleProgress"("gameId");
CREATE UNIQUE INDEX IF NOT EXISTS "PsnTrophy_userId_npCommunicationId_trophyId_key" ON "PsnTrophy"("userId", "npCommunicationId", "trophyId");
CREATE INDEX IF NOT EXISTS "PsnTrophy_userId_npCommunicationId_idx" ON "PsnTrophy"("userId", "npCommunicationId");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "PsnTitleProgress" ADD CONSTRAINT "PsnTitleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE "PsnTitleProgress" ADD CONSTRAINT "PsnTitleProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE "PsnTrophy" ADD CONSTRAINT "PsnTrophy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
