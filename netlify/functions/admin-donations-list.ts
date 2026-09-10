import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { calculateTentativeAmountDrawn } from "../lib/donation";

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

    const donations = await prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        allocations: {
          select: {
            id: true,
            accessToken: true,
            maxAmountDrawn: true,
            // useFullAmount: true,
            amountDrawn: true,
            orderId: true,
            createdAt: true,
            giftTokenId: true,
            giftToken: { select: { accessToken: true } },
          },
        },
        donor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Compute totalAmountDrawn per donation
    const result = donations.map((d) => ({
      ...d,
      totalAmountDrawn: d.allocations.reduce(
        (sum, a) => sum + (a.amountDrawn ?? 0),
        0,
      ),
      effectiveAmountDrawn: calculateTentativeAmountDrawn(d),
    }));

    return success(result);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
