import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  const userId = await auth(event, clerkClient);
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const { itemId } = JSON.parse(event.body || "{}");
    if (!itemId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid item" }),
      };
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item || !item.order || item.order.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Item not found" }),
      };
    }

    if (item.order.status !== "pending") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Cannot modify a non-pending order" }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify(updated),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to remove item" }),
    };
  }
};
