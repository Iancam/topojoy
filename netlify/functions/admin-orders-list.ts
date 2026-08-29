import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId, clerkUserId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden", 403);
    }

    const orders = await prisma.order.findMany({
      where: { status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        recipient: true,
        orderItems: {
          include: {
            mapConfig: {
              select: { id: true, title: true, filename: true, s3Key: true },
            },
          },
        },
        giftedMap: { select: { id: true } },
        donationAllocations: {
          select: {
            id: true,
            amountDrawn: true,
            giftTokenId: true,
            donation: {
              select: { id: true, donor: { select: { email: true } } },
            },
          },
        },
      },
    });

    return success(orders);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
