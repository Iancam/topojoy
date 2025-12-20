-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "filename" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid();
