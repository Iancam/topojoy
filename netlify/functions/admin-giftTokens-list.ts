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

    const giftTokens = await prisma.giftToken.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        allocations: {
          select: {
            id: true,
            maxAmountDrawn: true,
            amountDrawn: true,
            donation: {
              select: {
                id: true,
                amount: true,
                expiryDate: true,
                donor: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    });

    const result = giftTokens.map((gt) => ({
      ...gt,
      combinedMaxAmountDrawn: gt.allocations.reduce(
        (sum, a) => sum + (a.maxAmountDrawn ?? a.donation.amount),
        0,
      ),
      totalAmountDrawn: gt.allocations.reduce(
        (sum, a) => sum + (a.amountDrawn ?? 0),
        0,
      ),
    }));

    return success(result);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
