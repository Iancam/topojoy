-- CreateTable
CREATE TABLE "public"."Donation" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "restricted" BOOLEAN NOT NULL,
    "public" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "donateResiduals" BOOLEAN NOT NULL,
    "donorId" TEXT,
    "exipiryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GiftGiver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gratitudeMessage" TEXT,
    "reflections" TEXT,

    CONSTRAINT "GiftGiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GiftedMap" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "gratitudeMessage" TEXT,
    "giftGiverId" TEXT NOT NULL,

    CONSTRAINT "GiftedMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DonationToGiftGiver" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DonationToGiftGiver_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftedMap_orderId_key" ON "public"."GiftedMap"("orderId");

-- CreateIndex
CREATE INDEX "_DonationToGiftGiver_B_index" ON "public"."_DonationToGiftGiver"("B");

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftGiver" ADD CONSTRAINT "GiftGiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_giftGiverId_fkey" FOREIGN KEY ("giftGiverId") REFERENCES "public"."GiftGiver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DonationToGiftGiver" ADD CONSTRAINT "_DonationToGiftGiver_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DonationToGiftGiver" ADD CONSTRAINT "_DonationToGiftGiver_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."GiftGiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
