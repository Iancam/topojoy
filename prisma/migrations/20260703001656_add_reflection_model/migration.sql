/*
  Warnings:

  - You are about to drop the column `useFullAmount` on the `DonationAllocation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."DonationAllocation" DROP COLUMN "useFullAmount";

-- CreateTable
CREATE TABLE "public"."Reflection" (
    "id" TEXT NOT NULL,
    "mapConfigId" TEXT NOT NULL,
    "question" TEXT,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Reflection" ADD CONSTRAINT "Reflection_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
