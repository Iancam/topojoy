-- Step 1: Drop existing foreign key constraints
ALTER TABLE "public"."MapConfig" DROP CONSTRAINT "MapConfig_userId_fkey";
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";

-- Step 2: Convert MapConfig.userId from clerkId to internal id
UPDATE "public"."MapConfig" mc
SET "userId" = u."id"
FROM "public"."User" u
WHERE mc."userId" = u."clerkId";

-- Step 3: Convert Order.userId from clerkId to internal id
UPDATE "public"."Order" o
SET "userId" = u."id"
FROM "public"."User" u
WHERE o."userId" = u."clerkId";

-- Step 4: Add new foreign key constraints pointing to User.id
ALTER TABLE "public"."MapConfig" ADD CONSTRAINT "MapConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
