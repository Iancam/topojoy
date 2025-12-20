/*
  Warnings:

  - A unique constraint covering the columns `[filename,userId]` on the table `MapConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MapConfig_filename_userId_key" ON "public"."MapConfig"("filename", "userId");
