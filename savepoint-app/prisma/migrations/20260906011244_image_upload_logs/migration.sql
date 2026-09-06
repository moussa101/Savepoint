-- CreateTable
CREATE TABLE "ImageUploadLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageUploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageUploadLog_userId_createdAt_idx" ON "ImageUploadLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImageUploadLog" ADD CONSTRAINT "ImageUploadLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
