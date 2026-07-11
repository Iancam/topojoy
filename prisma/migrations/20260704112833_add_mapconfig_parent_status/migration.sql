-- AlterTable
ALTER TABLE "public"."MapConfig" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "status" TEXT;

-- AddForeignKey
ALTER TABLE "public"."MapConfig" ADD CONSTRAINT "MapConfig_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."MapConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
