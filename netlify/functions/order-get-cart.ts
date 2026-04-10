import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }
    // const { userId } = JSON.parse(event.body);
    const order = await prisma.order.findFirst({
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
      const order = await prisma.order.create({
        data: {
          userId: authUserId,
          status: "pending",
        },
      });
      return {
        statusCode: 200,
        body: JSON.stringify(order),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (error) {
    console.error("Error in order-get-cart:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
