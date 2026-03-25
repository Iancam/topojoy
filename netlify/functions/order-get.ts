import { createClerkClient } from "@clerk/backend";
import type { HandlerEvent } from "@netlify/functions";
import { auth } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
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

    const orderId = event.queryStringParameters?.orderId;
    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing orderId" }),
      };
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: authUserId },
      include: { orderItems: true },
    });

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Order not found" }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(order) };
  } catch (error) {
    console.error("order-get error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
