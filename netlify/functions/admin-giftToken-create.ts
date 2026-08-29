import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { calculateTentativeAmountDrawn } from "../lib/donation";
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

    const body = JSON.parse(event.body || "{}");
    const allocationIds: string[] = Array.isArray(body.allocationIds)
      ? body.allocationIds
      : [];
    const label: string | null =
      typeof body.label === "string" ? body.label.trim() || null : null;

    // if (allocationIds.length < 2) {
    //   return error(
    //     "At least two allocations are required to create a gift token",
    //     400,
    //   );
    // }
    if (new Set(allocationIds).size !== allocationIds.length) {
      return error("Duplicate allocation ids provided", 400);
    }

    const allocations = await prisma.donationAllocation.findMany({
      where: { id: { in: allocationIds } },
      include: {
        donation: { include: { allocations: true } },
      },
    });

    if (allocations.length !== allocationIds.length) {
      return error("One or more allocations could not be found", 404);
    }

    for (const alloc of allocations) {
      if (alloc.giftTokenId) {
        return error(
          `Allocation ${alloc.id} is already part of a gift token`,
          400,
        );
      }
      if (alloc.amountDrawn > 0) {
        return error(
          `Allocation ${alloc.id} has already been redeemed and cannot be grouped`,
          400,
        );
      }
      if (alloc.donation.restricted) {
        return error(
          `Donation ${alloc.donation.id} is restricted and must be used alone, no stacking`,
          400,
        );
      }
      if (alloc.donation.status !== "paid") {
        return error(
          `Donation ${alloc.donation.id} has not been paid yet`,
          400,
        );
      }
    }

    // Combined cap: sum of each allocation's own cap, falling back to the
    // remaining balance on its donation when uncapped ("full balance").
    const combinedMaxAmountDrawn = allocations.reduce((sum, alloc) => {
      if (alloc.maxAmountDrawn != null) {
        return sum + alloc.maxAmountDrawn;
      }
      const remaining =
        alloc.donation.amount - calculateTentativeAmountDrawn(alloc.donation);
      return sum + Math.max(0, remaining);
    }, 0);

    // Aggregate expiry can't outlive the earliest-expiring source donation.
    const expiryDate = allocations.reduce(
      (earliest, alloc) =>
        alloc.donation.expiryDate < earliest
          ? alloc.donation.expiryDate
          : earliest,
      allocations[0].donation.expiryDate,
    );

    const accessToken = randGiftCode();

    const giftToken = await prisma.$transaction(async (tx) => {
      const created = await tx.giftToken.create({
        data: { accessToken, label },
      });
      await tx.donationAllocation.updateMany({
        where: { id: { in: allocationIds } },
        data: { giftTokenId: created.id, accessToken: null },
      });
      return created;
    });

    return success({
      ...giftToken,
      combinedMaxAmountDrawn,
      expiryDate,
      allocationIds,
    });
  } catch (err: any) {
    console.error("Error creating gift token:", err);
    return error(err.message || "Error creating gift token", 500);
  }
};
