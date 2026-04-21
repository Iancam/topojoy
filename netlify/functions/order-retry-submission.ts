import { createClerkClient } from "@clerk/backend";
import type { HandlerEvent } from "@netlify/functions";
import { auth, error, success } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const { orderId } = JSON.parse(event.body ?? "{}");
    if (!orderId) {
      return error("Missing orderId", 400);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: userId },
    });

    if (!order) {
      return error("Order not found", 404);
    }

    if (order.status !== "paid") {
      return error(`Order is not in a retryable state: ${order.status}`, 400);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { submissionErrorMessage: null, submissionErrorAt: null },
    });

    await submitOrderToLumaprints(orderId);

    return success({ message: "Order submitted successfully" });
  } catch (err: any) {
    return error(err.message ?? "Internal server error", 500);
  }
};
