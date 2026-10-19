-- DropIndex
DROP INDEX "public"."TagAssignment_mapConfigId_idx";

-- DropIndex
DROP INDEX "public"."TagAssignment_userId_idx";

-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "backgroundTextGroups" JSONB;
