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
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return error("Unauthorized", 401);
    }

    const orderId = event.queryStringParameters?.orderId;
    if (!orderId) {
      return error("Missing orderId", 400);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: authUserId },
      include: { orderItems: true },
    });

    if (!order) {
      return error("Order not found", 404);
    }

    return success(order);
  } catch (err: any) {
    console.error("order-get error", err);
    return error("Internal server error", 500);
  }
};
