/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `OrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "s3Key" TEXT;

-- AlterTable
ALTER TABLE "public"."OrderItem" DROP COLUMN "imageUrl",
DROP COLUMN "s3Key";
