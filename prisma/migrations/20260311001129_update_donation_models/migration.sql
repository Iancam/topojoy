/*
  Warnings:

  - You are about to drop the column `exipiryDate` on the `Donation` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `GiftedMap` table. All the data in the column will be lost.
  - You are about to drop the column `gratitudeMessage` on the `GiftedMap` table. All the data in the column will be lost.
  - You are about to drop the `GiftGiver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DonationToGiftGiver` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[accessToken]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiryDate` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mapConfigId` to the `GiftedMap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `GiftedMap` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."GiftGiver" DROP CONSTRAINT "GiftGiver_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GiftedMap" DROP CONSTRAINT "GiftedMap_giftGiverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DonationToGiftGiver" DROP CONSTRAINT "_DonationToGiftGiver_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DonationToGiftGiver" DROP CONSTRAINT "_DonationToGiftGiver_B_fkey";

-- AlterTable
ALTER TABLE "public"."Donation" DROP COLUMN "exipiryDate",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "message" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."GiftedMap" DROP COLUMN "amount",
DROP COLUMN "gratitudeMessage",
ADD COLUMN     "GGgratitudeMessage" TEXT,
ADD COLUMN     "GGreflections" TEXT,
ADD COLUMN     "RgratitudeMessage" TEXT,
ADD COLUMN     "Rreflections" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mapConfigId" TEXT NOT NULL,
ADD COLUMN     "totalCost" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."GiftGiver";

-- DropTable
DROP TABLE "public"."_DonationToGiftGiver";

-- CreateTable
CREATE TABLE "public"."DonationAllocation" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "giftedMapId" TEXT NOT NULL,
    "amountDrawn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_accessToken_key" ON "public"."Donation"("accessToken");

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_giftGiverId_fkey" FOREIGN KEY ("giftGiverId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DonationAllocation" ADD CONSTRAINT "DonationAllocation_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "public"."Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DonationAllocation" ADD CONSTRAINT "DonationAllocation_giftedMapId_fkey" FOREIGN KEY ("giftedMapId") REFERENCES "public"."GiftedMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
