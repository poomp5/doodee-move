-- CreateTable for TransitSubmission
CREATE TABLE "TransitSubmission" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "TransitSubmission_pkey" PRIMARY KEY ("id")
);

-- Add new fields to UserSession
ALTER TABLE "UserSession"
ADD COLUMN "transitImageUrl" TEXT,
ADD COLUMN "transitData" TEXT;
