import { createClerkClient } from "@clerk/backend";
import type { HandlerEvent } from "@netlify/functions";
import { auth } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const { orderId } = JSON.parse(event.body ?? "{}");
    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing orderId" }),
      };
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: authUserId },
    });

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Order not found" }),
      };
    }

    if (order.status !== "paid") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Order is not in a retryable state" }),
      };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { submissionErrorMessage: null, submissionErrorAt: null },
    });

    await submitOrderToLumaprints(orderId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Order submitted successfully" }),
    };
  } catch (error: any) {
    console.error("order-retry-submission error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message ?? "Internal server error" }),
    };
  }
};
