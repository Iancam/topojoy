-- CreateTable
CREATE TABLE "public"."TagNode" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "kind" VARCHAR(64),
    "suggestedKinds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TagAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mapConfigId" TEXT NOT NULL,
    "path" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable (implicit many-to-many: nodes attached to an assignment)
CREATE TABLE "_TagAssignmentToTagNode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagAssignmentToTagNode_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE UNIQUE INDEX "TagNode_key_key" ON "public"."TagNode"("key");

-- CreateIndex
CREATE INDEX "TagAssignment_mapConfigId_idx" ON "public"."TagAssignment"("mapConfigId");

-- CreateIndex
CREATE INDEX "TagAssignment_userId_idx" ON "public"."TagAssignment"("userId");

-- CreateIndex
CREATE INDEX "_TagAssignmentToTagNode_B_index" ON "_TagAssignmentToTagNode"("B");

-- AddForeignKey
ALTER TABLE "public"."TagNode" ADD CONSTRAINT "TagNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TagAssignment" ADD CONSTRAINT "TagAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TagAssignment" ADD CONSTRAINT "TagAssignment_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagAssignmentToTagNode" ADD CONSTRAINT "_TagAssignmentToTagNode_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."TagAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagAssignmentToTagNode" ADD CONSTRAINT "_TagAssignmentToTagNode_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TagNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
