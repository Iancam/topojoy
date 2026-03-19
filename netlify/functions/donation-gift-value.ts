import prisma from "../lib/prisma";
import { getShippingPrice } from "../lib";

// A representative US address used to estimate shipping cost
const REPRESENTATIVE_ADDRESS = {
  name: "Gift Recipient",
  line1: "123 Main St",
  city: "Denver",
  state: "CO",
  postalCode: "80203",
  country: "US",
};

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const accessToken = body.accessToken;
  const items: {
    subcategoryId: string;
    width: number;
    height: number;
    options: number[];
    quantity: number;
  }[] = body.items; // array of

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing accessToken" }),
    };
  }

  try {
    const donation = await prisma.donation.findUnique({
      where: { accessToken },
      select: {
        id: true,
        amount: true,
        status: true,
        expiryDate: true,
        allocations: { select: { amountDrawn: true } },
      },
    });
    if (!donation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Gift not found" }),
      };
    }

    if (donation.status !== "paid") {
      return {
        statusCode: 402,
        body: JSON.stringify({ message: "Gift payment not completed" }),
      };
    }

    if (donation.expiryDate && new Date(donation.expiryDate) < new Date()) {
      return {
        statusCode: 410,
        body: JSON.stringify({ message: "Gift has expired" }),
      };
    }

    // How much of the donation is still available (not yet drawn by prior allocations)
    const alreadyDrawnCents = donation.allocations.reduce(
      (sum, a) => sum + a.amountDrawn,
      0,
    );
    const availableAmountCents = donation.amount - alreadyDrawnCents;

    if (availableAmountCents <= 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: "Gift has already been fully redeemed",
        }),
      };
    }

    // Get cheapest shipping cost using a representative item + address
    let shippingCostObject: Record<string, number> = {};
    let adjustedAmountPerItemCents: Record<string, number> = {};

    try {
      const shippingResults = await Promise.all(
        items.map(
          async (item) =>
            [
              item.subcategoryId,
              await getShippingPrice({
                address: REPRESENTATIVE_ADDRESS,
                items: [item],
              }),
            ] as [string, { shippingMethods?: { cost: number }[] }],
        ),
      );

      const findMinCost = (min: number, m: { cost: number }) =>
        m.cost < min ? m.cost : min;

      const shippingCostEntries = shippingResults?.map(
        ([id, shipping]: [
          string,
          { shippingMethods?: { cost: number }[] },
        ]) => {
          const minShippingCost = shipping.shippingMethods?.reduce(
            findMinCost,
            Infinity,
          );
          return [id, Math.round((minShippingCost ?? 0) * 100)];
        },
      );
      shippingCostObject = Object.fromEntries(shippingCostEntries);
      adjustedAmountPerItemCents = Object.fromEntries(
        shippingCostEntries.map(([id, cost]) => [
          id,
          Math.max(0, availableAmountCents - (cost as number)),
        ]),
      );
    } catch (err) {
      console.warn("Could not fetch shipping estimate, defaulting to 0", err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        donationId: donation.id,
        grossAmountCents: donation.amount,
        alreadyDrawnCents,
        availableAmountCents,
        shippingCosts: shippingCostObject,
        adjustedAmountPerItemCents,
      }),
    };
  } catch (error: any) {
    console.error("donation-gift-value error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Internal server error",
      }),
    };
  }
};
