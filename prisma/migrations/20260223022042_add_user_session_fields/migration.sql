-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "destLabel" TEXT,
ADD COLUMN     "destLat" DOUBLE PRECISION,
ADD COLUMN     "destLng" DOUBLE PRECISION,
ADD COLUMN     "pendingRoutes" JSONB;
