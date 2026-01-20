/*
  Warnings:

  - You are about to drop the column `nonce` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `externalItemId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `nonce` on the `OrderItem` table. All the data in the column will be lost.
  - Added the required column `userContribution` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_recipientId_fkey";

-- DropIndex
DROP INDEX "public"."Order_nonce_key";

-- DropIndex
DROP INDEX "public"."OrderItem_nonce_key";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "nonce",
DROP COLUMN "quantity",
ALTER COLUMN "totalPrice" SET DEFAULT 0,
ALTER COLUMN "recipientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."OrderItem" DROP COLUMN "externalItemId",
DROP COLUMN "nonce",
ADD COLUMN     "userContribution" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."Recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
