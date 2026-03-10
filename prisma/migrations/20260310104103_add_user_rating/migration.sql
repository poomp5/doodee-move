-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT,
    "displayName" TEXT,
    "rating" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'usability',
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRating_createdAt_idx" ON "UserRating"("createdAt");

-- CreateIndex
CREATE INDEX "UserRating_rating_idx" ON "UserRating"("rating");
