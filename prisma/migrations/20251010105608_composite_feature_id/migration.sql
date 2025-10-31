/*
  Warnings:

  - The primary key for the `Feature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Feature` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Feature" DROP CONSTRAINT "Feature_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Feature_pkey" PRIMARY KEY ("name", "mapConfigId", "type");
