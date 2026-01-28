import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "endpoint blocked, use stripe payment webhook instead",
    }),
  };

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

    // Find the latest paid order for this user
    const order = await prisma.order.findFirst({
      where: {
        userId: authUserId,
        status: "paid",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No paid order found" }),
      };
    }

    const result = await submitOrderToLumaprints(order.id);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("print-submit-order error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
