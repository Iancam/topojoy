import prisma from "../lib/prisma";
import { error, success } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  const accessToken = event.queryStringParameters?.accessToken;

  if (!accessToken) {
    return error("Missing accessToken", 400);
  }

  try {
    const donation = await prisma.donation.findUnique({
      where: { accessToken },
      select: {
        id: true,
        amount: true,
        message: true,
        expiryDate: true,
        status: true,
        donor: { select: { name: true } },
        allocations: {
          select: {
            orderId: true,
            amountDrawn: true,
          },
        },
      },
    });

    if (!donation) {
      return error("Gift not found", 404);
    }

    return success(donation);
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
