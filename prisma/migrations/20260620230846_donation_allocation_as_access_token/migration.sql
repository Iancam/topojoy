/*
  Warnings:

  - A unique constraint covering the columns `[accessToken]` on the table `DonationAllocation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."DonationAllocation" DROP CONSTRAINT "DonationAllocation_orderId_fkey";

-- DropIndex
DROP INDEX "public"."Donation_accessToken_key";

-- AlterTable
ALTER TABLE "public"."DonationAllocation" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "maxAmountDrawn" INTEGER,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DonationAllocation_accessToken_key" ON "public"."DonationAllocation"("accessToken");

-- AddForeignKey
ALTER TABLE "public"."DonationAllocation" ADD CONSTRAINT "DonationAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
