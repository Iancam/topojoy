import { createClerkClient } from "@clerk/backend";
import type { HandlerEvent } from "@netlify/functions";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const orders = await prisma.order.findMany({
      where: { userId: userId, status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
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

    return success(orders);
  } catch (err: any) {
    return error(err.message ?? "Internal server error", 500);
  }
};
