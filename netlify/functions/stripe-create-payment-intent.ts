import Stripe from "stripe";
// import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth, getShippingPrice } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const stripeSecretKey = process.env.SBX_STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("SBX_STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10",
});

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
        body: JSON.stringify({ message: "No shipping prices found" }),
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
    const baseAmount = order.totalPrice || 0; // in cents
    const shippingAmount =
      typeof shippingCostCents === "number" ? shippingCostCents : 0;
    const amount = baseAmount + shippingAmount;

    if (amount < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid amount for payment" }),
      };
    }

    // get gift token from body
    const body = JSON.parse(event.body || "{}");
    const giftToken: string | undefined = body.giftToken;

    let finalAmount = amount;

    // process gift token if it exists
    if (giftToken) {
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
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid gift token" }),
        };
      }
      if (donation.expiryDate <= new Date()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Gift token has expired" }),
        };
      }
      if (donation.status !== "paid") {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: `Gift token status is invalid. Status: ${donation.status}`,
          }),
        };
      }

      const alreadyDrawnCents = donation.allocations.reduce(
        (sum, a) => sum + a.amountDrawn,
        0,
      );
      const availableAmountCents = donation.amount - alreadyDrawnCents;

      if (availableAmountCents <= 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Gift has already been fully redeemed",
          }),
        };
      }

      const amountDrawn = Math.min(availableAmountCents, amount);
      finalAmount = Math.max(0, amount - amountDrawn);

      await prisma.donationAllocation.create({
        data: {
          donationId: donation.id,
          orderId: order.id,
          amountDrawn,
        },
      });

      if (finalAmount === 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: new Date() },
        });
        await submitOrderToLumaprints(order.id);
        return {
          statusCode: 200,
          body: JSON.stringify({ freeOrder: true, amount: 0 }),
        };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
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
        amount: finalAmount,
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
