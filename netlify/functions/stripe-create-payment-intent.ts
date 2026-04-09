import Stripe from "stripe";
// import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth, getShippingPrice } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";
import { initStripe } from "../lib/stripe";

const stripe = initStripe();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  // get gift token from body
  const body = JSON.parse(event.body || "{}");
  const giftToken: string | undefined = body.giftToken;

  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        userId: authUserId,
        status: "pending",
      },
      include: {
        recipient: true,
        orderItems: true,
      },
    });

    if (!order) {
      console.error("No pending order found for user", authUserId);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No pending order found" }),
      };
    }
    const address = order?.recipient;
    const items = order?.orderItems;
    const shippingMethod = order?.shippingMethod;

    if (!address || !items || !shippingMethod) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "No address, shippingMethod, or items found",
        }),
      };
    }
    const shippingResult = await getShippingAmount(
      shippingMethod,
      address,
      items,
    );

    if (shippingResult.statusCode && shippingResult.statusCode >= 400) {
      return shippingResult;
    }

    const baseAmount = order.totalPrice || 0; // in cents
    const amntToPay = baseAmount + (shippingResult.shippingAmount || 0);

    if (amntToPay < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid amntToPay for payment" }),
      };
    }

    let finalAmntToPay = amntToPay;

    // process gift token if it exists
    const giftTokenResult = await processGiftToken(giftToken, amntToPay);
    if (giftTokenResult.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: giftTokenResult.message }),
      };
    }

    finalAmntToPay = giftTokenResult.finalAmntToPay;
    const donation = giftTokenResult.donation;
    const amountDrawn = giftTokenResult.amountDrawn;

    if (finalAmntToPay === 0 && donation) {
      prisma.order.update({
        where: { id: order.id },
        data: { status: "paid", paidAt: new Date() },
      });

      prisma.donationAllocation.create({
        data: {
          donationId: donation.id,
          orderId: order.id,
          amountDrawn,
        },
      });

      await submitOrderToLumaprints(order.id);

      return {
        statusCode: 200,
        body: JSON.stringify({ freeOrder: true, amount: 0 }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmntToPay,
      currency: order.currency || "usd",
      metadata: {
        orderId: order.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: finalAmntToPay,
        currency: order.currency || "usd",
      }),
    };
  } catch (error: any) {
    console.error("stripe-create-payment-intent error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

async function processGiftToken(
  giftToken: string | undefined,
  amntToPay: number,
) {
  const errorVal = {
    finalAmntToPay: amntToPay,
    donation: null,
    amountDrawn: 0,
  };
  if (!giftToken) {
    return errorVal;
  }

  const donation = await prisma.donation.findUnique({
    where: { accessToken: giftToken },
    select: {
      id: true,
      amount: true,
      expiryDate: true,
      status: true,
      allocations: { select: { amountDrawn: true } },
    },
  });

  if (!donation) {
    return { ...errorVal, message: "Invalid gift token" };
  }
  if (donation.expiryDate <= new Date()) {
    return { ...errorVal, message: "Gift token has expired" };
  }
  if (donation.status !== "paid") {
    return {
      ...errorVal,
      message: `Gift token status is invalid. Status: ${donation.status}`,
    };
  }

  const alreadyDrawnCents = donation.allocations.reduce(
    (sum, a) => sum + a.amountDrawn,
    0,
  );
  const availableAmountCents = donation.amount - alreadyDrawnCents;
  // you should have an error if the user thinks they're redeeming a gift but
  // actually there's no more left to redeem
  if (availableAmountCents <= 0) {
    return {
      ...errorVal,
      message: "Gift has already been fully redeemed",
    };
  }

  const amountDrawn = Math.min(availableAmountCents, amntToPay);
  const finalAmntToPay = Math.max(0, amntToPay - amountDrawn);

  return {
    finalAmntToPay,
    donation,
    amountDrawn,
  };
}

async function getShippingAmount(
  shippingMethod: string,
  address: any,
  items: any[],
) {
  const { message, shippingMethods } = await getShippingPrice({
    address: {
      ...address,
    },
    items: items.map((item) => {
      return {
        subcategoryId: item.subcategoryId,
        width: item.width,
        height: item.height,
        options: item.orderItemOptions as number[],
        quantity: item.quantity,
      };
    }),
  });

  if (!shippingMethods) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `No shipping prices found, lumaprints: ${message}`,
      }),
    };
  }

  const selectedShippingOption = shippingMethods.filter(
    (method: any) => method.method === shippingMethod,
  )[0];

  if (!selectedShippingOption) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `No shipping option associated with ${shippingMethod} found`,
      }),
    };
  }

  const shippingCostCents = selectedShippingOption.cost * 100;
  if (selectedShippingOption.cost == null) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `No shipping cost associated with ${shippingMethod} found`,
      }),
    };
  }
  const shippingAmount =
    typeof shippingCostCents === "number" ? shippingCostCents : 0;

  return { shippingAmount };
}
