-- DropForeignKey
ALTER TABLE "public"."MapConfig" DROP CONSTRAINT "MapConfig_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."MapConfig" ADD CONSTRAINT "MapConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
