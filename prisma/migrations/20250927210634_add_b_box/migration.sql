/*
  Warnings:

  - Added the required column `bbox` to the `MapConfig` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "bbox" JSONB NOT NULL;
