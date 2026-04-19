import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return error("Unauthorized", 401);
    }
    // const { userId } = JSON.parse(event.body);
    let order = await prisma.order.findFirst({
      where: {
        userId: authUserId,
        status: "pending",
      },
      include: {
        orderItems: {
          include: {
            mapConfig: {
              select: { id: true, title: true, filename: true, s3Key: true },
            },
          },
        },
      },
    });

    if (!order) {
      order = await prisma.order.create({
        data: {
          userId: authUserId,
          status: "pending",
        },
        include: {
          orderItems: {
            include: {
              mapConfig: {
                select: { id: true, title: true, filename: true, s3Key: true },
              },
            },
          },
        },
      });
    }
    return success(order);
  } catch (err: any) {
    console.error("Error in order-get-cart:", err);
    return error(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
};
