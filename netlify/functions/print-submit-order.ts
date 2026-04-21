import { createClerkClient } from "@clerk/backend";
import { auth, error, success } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  return error("endpoint blocked, use stripe payment webhook instead", 400);

  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    // Find the latest paid order for this user
    const order = await prisma.order.findFirst({
      where: {
        userId: userId,
        status: "paid",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!order) {
      return error("No paid order found", 404);
    }

    const result = await submitOrderToLumaprints(order.id);

    return success(result);
  } catch (err: any) {
    console.error("print-submit-order error", err);
    return error(err.message ?? "Internal server error", 500);
  }
};
