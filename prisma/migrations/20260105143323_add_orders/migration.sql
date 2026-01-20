-- CreateTable
CREATE TABLE "public"."Recipient" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(128),
    "phone" VARCHAR(64),
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shippingMethod" TEXT NOT NULL DEFAULT 'standard',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalPrice" INTEGER NOT NULL,
    "recipientId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItemOption" (
    "id" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,

    CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "subcategoryId" INTEGER NOT NULL,
    "externalItemId" TEXT NOT NULL,
    "mapConfigId" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "itemPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_nonce_key" ON "public"."Order"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_nonce_key" ON "public"."OrderItem"("nonce");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."Recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItemOption" ADD CONSTRAINT "OrderItemOption_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_mapConfigId_fkey" FOREIGN KEY ("mapConfigId") REFERENCES "public"."MapConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
