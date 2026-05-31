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

  try {
    const giftedMaps = await prisma.giftedMap.findMany({
      where: { giftGiverId: userId },
      orderBy: { createdAt: "desc" },
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

    return success(
      giftedMaps.map((g) => ({ ...g, role: "giver" as const })),
    );
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
