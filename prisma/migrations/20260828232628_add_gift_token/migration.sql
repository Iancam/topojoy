-- AlterTable
ALTER TABLE "public"."DonationAllocation" ADD COLUMN     "giftTokenId" TEXT;

-- CreateTable
CREATE TABLE "public"."GiftToken" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "label" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftToken_accessToken_key" ON "public"."GiftToken"("accessToken");

-- AddForeignKey
ALTER TABLE "public"."DonationAllocation" ADD CONSTRAINT "DonationAllocation_giftTokenId_fkey" FOREIGN KEY ("giftTokenId") REFERENCES "public"."GiftToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftToken" ADD CONSTRAINT "GiftToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
