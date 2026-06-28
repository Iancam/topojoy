import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { createRandomAccessToken, error, success } from "../lib";
import { calculateTentativeAmountDrawn } from "../lib/donation";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { donationId, maxAmountDrawn } = body;

    if (!donationId) {
      return error("Missing required field: donationId", 400);
    }

    if (!maxAmountDrawn || maxAmountDrawn <= 0) {
      return error("maxAmountDrawn must be a positive number", 400);
    }

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        allocations: true,
      },
    });

    if (!donation) {
      return error("Donation not found", 404);
    }

    const effectiveAmount =
      donation.amount - calculateTentativeAmountDrawn(donation);

    if (maxAmountDrawn > effectiveAmount) {
      return error(
        "Max amount drawn cannot be greater than effective amount on donation",
        400,
      );
    }

    const accessToken = createRandomAccessToken();

    const donationAllocation = await prisma.donationAllocation.create({
      data: {
        donationId,
        maxAmountDrawn: maxAmountDrawn,
        orderId: null,
        amountDrawn: 0,
        accessToken,
      },
    });

    return success(donationAllocation);
  } catch (err: any) {
    console.error("Error creating donation allocation:", err);
    return error(err.message || "error creating donation allocation", 500);
  }
};
