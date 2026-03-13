-- DropIndex
DROP INDEX "UserRating_rating_idx";

-- CreateIndex
CREATE INDEX "TransitSubmission_status_createdAt_idx" ON "TransitSubmission"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserRating_category_rating_idx" ON "UserRating"("category", "rating");
