import { createClerkClient } from "@clerk/backend";
import { auth, error, success } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId } = await auth(event, clerkClient);
  if (!userId) {
    return error("Unauthorized", 401);
  }

  const body = JSON.parse(event.body || "{}");
  const { giftedMapId, message, reflection } = body;

  if (!giftedMapId) {
    return error("Missing giftedMapId", 400);
  }

  if (typeof message !== "string" && typeof reflection !== "string") {
    return error("At least one of message or reflection must be provided", 400);
  }

  try {
    const giftedMap = await prisma.giftedMap.findUnique({
      where: { id: giftedMapId },
      select: {
        giftGiverId: true,
        recipientId: true,
        orderId: true,
      },
    });

    if (!giftedMap) {
      return error("GiftedMap not found", 404);
    }

    // Determine role — also allow the order owner as the recipient
    // if recipientId hasn't been set yet
    let role: "giver" | "recipient" | null = null;

    if (giftedMap.giftGiverId === userId) {
      role = "giver";
    } else if (giftedMap.recipientId === userId) {
      role = "recipient";
    } else {
      const order = await prisma.order.findUnique({
        where: { id: giftedMap.orderId },
        select: { userId: true },
      });
      if (order?.userId === userId) {
        role = "recipient";
      }
    }

    if (!role) {
      return error("Forbidden", 403);
    }

    const updateData =
      role === "giver"
        ? {
            giverMessage: typeof message === "string" ? message : undefined,
            giverReflection:
              typeof reflection === "string" ? reflection : undefined,
          }
        : {
            recipientMessage: typeof message === "string" ? message : undefined,
            recipientReflection:
              typeof reflection === "string" ? reflection : undefined,
            // Stamp the recipientId so future lookups are fast
            recipientId: userId,
          };

    const updated = await prisma.giftedMap.update({
      where: { id: giftedMapId },
      data: updateData,
      select: {
        id: true,
        giverMessage: true,
        giverReflection: true,
        recipientMessage: true,
        recipientReflection: true,
      },
    });

    return success({ ...updated, role });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
