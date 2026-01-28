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

    const order = await prisma.order.findFirst({
      where: { userId: authUserId },
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No orders found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (error) {
    console.error("order-latest error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
