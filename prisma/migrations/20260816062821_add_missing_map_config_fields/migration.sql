-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "backgroundTextContrast" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
ADD COLUMN     "eleVis" TEXT NOT NULL DEFAULT 'original',
ADD COLUMN     "forceCollisionDetection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "legendEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textSizeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0;
