-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "submissionErrorAt" TIMESTAMP(3),
ADD COLUMN     "submissionErrorMessage" TEXT;
