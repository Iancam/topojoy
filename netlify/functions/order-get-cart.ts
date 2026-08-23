import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  try {
    const { clerkUserId, user } = await auth(event, clerkClient);
    if (!clerkUserId) {
      return error("Unauthorized", 401);
    }

    if (!user) {
      return error("User not found", 404);
    }

    let order = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: "pending",
      },
      include: {
        orderItems: {
          include: {
            mapConfig: {
              select: {
                id: true,
                title: true,
                filename: true,
                s3Key: true,
                giftAccessToken: true,
                parent: {
                  select: {
                    giftAccessToken: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      order = await prisma.order.create({
        data: {
          userId: user.id,
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
    return error(err.message ?? "Internal server error", 500);
  }
};
