/*
  Warnings:

  - Added the required column `discretionary` to the `Donation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Donation" ADD COLUMN     "discretionary" BOOLEAN NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "exipiryDate" DROP NOT NULL;
