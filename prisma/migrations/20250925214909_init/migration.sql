-- CreateEnum
CREATE TYPE "public"."featureType" AS ENUM ('mountain', 'river', 'trail', 'lake');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "clerkId" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feature" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mapConfigId" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "type" "public"."featureType" NOT NULL DEFAULT 'mountain',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MapConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "config" VARCHAR(64) NOT NULL,
    "zoomLevel" INTEGER NOT NULL,
    "curveDensity" INTEGER NOT NULL,
    "selectedTrails" JSONB,
    "backgroundText" TEXT,
    "backgroundTextElevationRange0" DOUBLE PRECISION NOT NULL,
    "backgroundTextElevationRange1" DOUBLE PRECISION NOT NULL,
    "backgroundTextHighContrast" BOOLEAN NOT NULL,
    "crossHatch" BOOLEAN NOT NULL,
    "colorPlan" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "public"."User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Feature" ADD CONSTRAINT "Feature_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapConfig" ADD CONSTRAINT "MapConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
