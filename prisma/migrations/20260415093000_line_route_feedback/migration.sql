ALTER TABLE "UserRating"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'web',
ADD COLUMN "feedbackText" TEXT,
ADD COLUMN "routeMode" TEXT,
ADD COLUMN "destLabel" TEXT;

CREATE INDEX "UserRating_source_createdAt_idx" ON "UserRating"("source", "createdAt");
