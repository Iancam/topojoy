-- CreateTable
CREATE TABLE "public"."Annotation" (
    "id" TEXT NOT NULL,
    "mapConfigId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fontSize" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "xRatio" DOUBLE PRECISION NOT NULL,
    "yRatio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Annotation" ADD CONSTRAINT "Annotation_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
