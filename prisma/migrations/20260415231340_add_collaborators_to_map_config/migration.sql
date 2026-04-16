-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "collaborators" TEXT[] DEFAULT ARRAY[]::TEXT[];
