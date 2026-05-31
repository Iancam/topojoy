import { createClerkClient } from "@clerk/backend";
import { auth, error, success } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  const { userId } = await auth(event, clerkClient);
  if (!userId) {
    return error("Unauthorized", 401);
  }

  const giftedMapId = event.queryStringParameters?.giftedMapId;
  const orderId = event.queryStringParameters?.orderId;

  if (!giftedMapId && !orderId) {
    return error("Missing giftedMapId or orderId", 400);
  }

  try {
    const giftedMap = await prisma.giftedMap.findFirst({
      where: giftedMapId ? { id: giftedMapId } : { orderId },
      select: {
        id: true,
        orderId: true,
        totalCost: true,
        createdAt: true,
        giverMessage: true,
        giverReflection: true,
        recipientMessage: true,
        recipientReflection: true,
        giftGiverId: true,
        recipientId: true,
        mapConfig: {
          select: { id: true, title: true, imageUrl: true },
        },
      },
    });

    if (!giftedMap) {
      return error("GiftedMap not found", 404);
    }

    // Only the giver or the recipient may view this record
    if (
      giftedMap.giftGiverId !== userId &&
      giftedMap.recipientId !== userId
    ) {
      // Fallback: allow the order owner (recipient who placed the order)
      const order = await prisma.order.findUnique({
        where: { id: giftedMap.orderId },
        select: { userId: true },
      });
      if (order?.userId !== userId) {
        return error("Forbidden", 403);
      }
    }

    // Tell the caller which role they are so the UI can render accordingly
    const role =
      giftedMap.giftGiverId === userId ? "giver" : "recipient";

    return success({ ...giftedMap, role });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
