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
    const { itemId } = JSON.parse(event.body || "{}");
    if (!itemId) {
      return error("Invalid item", 400);
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

    const orderId = item.orderId;
    const itemTotal = item.totalPrice || 0;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });

      const sum = await tx.orderItem.aggregate({
        where: { orderId },
        _sum: { totalPrice: true },
      });

      const newTotal = sum._sum.totalPrice ?? 0;

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { totalPrice: newTotal },
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
    return error(err.message ?? "Failed to remove item", 500);
  }
};
