import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { randGiftCode } from "../lib/giftCodeGenerator";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
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

    const { id } = JSON.parse(event.body || "{}");
    if (!id) {
      return error("Missing required field: id", 400);
    }

    const giftToken = await prisma.giftToken.findUnique({
      where: { id },
      include: { allocations: true },
    });

    if (!giftToken) {
      return error("Gift token not found", 404);
    }

    if (giftToken.orderId) {
      return error(
        "Cannot delete a gift token that has already been used",
        400,
      );
    }

    // Ungroup: give each member allocation back its own standalone access
    // token so it remains independently redeemable.
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        giftToken.allocations.map((alloc) => {
          return tx.donationAllocation.update({
            where: { id: alloc.id },
            data: { giftTokenId: null, accessToken: randGiftCode() },
          });
        }),
      );

      await tx.giftToken.delete({ where: { id } });
    });

    return success({ id });
  } catch (err: any) {
    return error(err.message || "Error deleting gift token", 500);
  }
};
