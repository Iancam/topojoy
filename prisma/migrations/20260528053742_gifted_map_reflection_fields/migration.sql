-- DropForeignKey
ALTER TABLE "public"."GiftedMap" DROP CONSTRAINT "GiftedMap_mapConfigId_fkey";

-- AlterTable
ALTER TABLE "public"."GiftedMap" DROP COLUMN "GGgratitudeMessage",
DROP COLUMN "GGreflections",
DROP COLUMN "RgratitudeMessage",
DROP COLUMN "Rreflections",
ADD COLUMN     "giverMessage" TEXT,
ADD COLUMN     "giverReflection" TEXT,
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "recipientMessage" TEXT,
ADD COLUMN     "recipientReflection" TEXT,
ALTER COLUMN "mapConfigId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftedMap" ADD CONSTRAINT "GiftedMap_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
