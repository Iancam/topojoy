/*
  Warnings:

  - You are about to drop the `OrderItemOption` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orderItemOptions` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."OrderItemOption" DROP CONSTRAINT "OrderItemOption_orderItemId_fkey";

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "orderItemOptions" JSONB NOT NULL;

-- DropTable
DROP TABLE "public"."OrderItemOption";
