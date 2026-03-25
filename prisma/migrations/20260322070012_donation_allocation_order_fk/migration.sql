/*
  Warnings:

  - You are about to drop the column `giftedMapId` on the `DonationAllocation` table. All the data in the column will be lost.
  - Added the required column `orderId` to the `DonationAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."DonationAllocation" DROP CONSTRAINT "DonationAllocation_giftedMapId_fkey";

-- AlterTable
ALTER TABLE "public"."DonationAllocation" DROP COLUMN "giftedMapId",
ADD COLUMN     "orderId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."DonationAllocation" ADD CONSTRAINT "DonationAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
