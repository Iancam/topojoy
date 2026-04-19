import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  const userId = await auth(event, clerkClient);
  if (!userId) {
    return error("Unauthorized", 401);
  }

  try {
    const { itemId, quantity } = JSON.parse(event.body || "{}");
    if (!itemId || typeof quantity !== "number" || quantity < 1) {
      return error("Invalid item or quantity", 400);
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item || !item.order || item.order.userId !== userId) {
      return error("Item not found", 404);
    }

    if (item.order.status !== "pending") {
      return error("Cannot modify a non-pending order", 400);
    }

    const oldTotal = item.totalPrice || 0;
    const newTotal = item.itemPrice * quantity + item.userContribution;
    const diff = newTotal - oldTotal;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity, totalPrice: newTotal },
      });

      const sum = await tx.orderItem.aggregate({
        where: { orderId: item.orderId },
        _sum: { totalPrice: true },
      });
      const newTotalOrder = sum._sum.totalPrice ?? 0;

      const updatedOrder = await tx.order.update({
        where: { id: item.orderId },
        data: { totalPrice: newTotalOrder },
        include: {
          orderItems: {
            include: {
              mapConfig: { select: { id: true, title: true, filename: true } },
            },
          },
        },
      });

      return updatedOrder;
    });

    return success(updated);
  } catch (err: any) {
    console.error(err);
    return error("Failed to update item", 500);
  }
};
