import Stripe from "stripe";
// import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth, error, getShippingPrice, success } from "../lib";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";
import { createGiftedMapIfApplicable } from "../lib/giftedMap";
import { initStripe } from "../lib/stripe";
import { sendEmail } from "../lib/email";
import React from "react";
import { OrderConfirmation } from "../emails/OrderConfirmation";

const stripe = initStripe();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  // get gift token from body
  const body = JSON.parse(event.body || "{}");
  const giftToken: string | undefined = body.giftToken;

  try {
    const { userId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const order = await prisma.order.findFirst({
      where: {
        userId: userId,
        status: "pending",
      },
      include: {
        recipient: true,
        orderItems: { include: { mapConfig: { select: { title: true } } } },
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      return error("No pending order found", 400);
    }
    const address = order?.recipient;
    const items = order?.orderItems;
    const shippingMethod = order?.shippingMethod;

    if (!address || !items || !shippingMethod) {
      return error("No address, shippingMethod, or items found", 400);
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
      return error("Invalid amntToPay for payment", 400);
    }

    let finalAmntToPay = amntToPay;

    // process gift token if it exists
    const giftTokenResult = await processGiftToken(giftToken, amntToPay);
    if ("message" in giftTokenResult && giftTokenResult.message) {
      return error(giftTokenResult.message, 400);
    }

    finalAmntToPay = giftTokenResult.finalAmntToPay;
    const donationAllocation = giftTokenResult.donationAllocation;
    const amountDrawn = giftTokenResult.amountDrawn;

    if (finalAmntToPay === 0 && donationAllocation) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "paid", paidAt: new Date() },
      });

      await prisma.donationAllocation.update({
        where: { id: donationAllocation.id },
        data: {
          orderId: order.id,
          amountDrawn,
        },
      });

      if (donationAllocation.donorId) {
        await createGiftedMapIfApplicable({
          donorId: donationAllocation.donation.donorId,
          orderId: order.id,
          orderItems: order.orderItems,
          totalCost: order.totalPrice,
        });
      }

      await submitOrderToLumaprints(order.id);

      const recipientEmail = order.recipient?.email ?? order.user?.email;
      const recipientName =
        order.recipient?.name ?? order.user?.name ?? "there";
      if (recipientEmail) {
        const fmt = (cents: number) =>
          (cents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          });
        await sendEmail({
          to: recipientEmail,
          subject: "Your TopoJoy order is confirmed",
          template: React.createElement(OrderConfirmation, {
            recipientName,
            items: order.orderItems.map((item: any) => ({
              title: item.mapConfig?.title ?? "",
              printType: item.printType ?? "",
              width: item.width,
              height: item.height,
              quantity: item.quantity,
              priceFormatted: fmt(item.totalPrice),
            })),
            totalFormatted: fmt(order.totalPrice),
            shippingMethod: order.shippingMethod ?? "",
            shippingAddress: order.recipient
              ? [
                  order.recipient.addressLine1,
                  order.recipient.addressLine2,
                  order.recipient.city,
                  order.recipient.state,
                  order.recipient.postalCode,
                  order.recipient.country,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "",
          }),
        }).catch((e: any) =>
          console.error("[email] Order confirmation failed:", e),
        );
      }

      return success({
        freeOrder: true,
        amount: 0,
      });
    }

    if (donationAllocation.donation && donationAllocation.donation.donorId) {
      await createGiftedMapIfApplicable({
        donorId: donationAllocation.donation.donorId,
        orderId: order.id,
        orderItems: order.orderItems,
        totalCost: order.totalPrice,
      });
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

    return success({
      clientSecret: paymentIntent.client_secret,
      amount: finalAmntToPay,
      currency: order.currency || "usd",
      paymentIntent,
    });
  } catch (err: any) {
    return error("Internal server error", 500);
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

  const donationAllocation = await prisma.donationAllocation.findUnique({
    where: { accessToken: giftToken },
    select: {
      id: true,
      maxAmountDrawn: true,
      donation: {
        select: {
          id: true,
          amount: true,
          expiryDate: true,
          status: true,
          donorId: true,
          allocations: { select: { amountDrawn: true } },
        },
      },
    },
  });

  if (!donationAllocation) {
    return { ...errorVal, message: "Invalid gift token" };
  }
  const donation = donationAllocation?.donation;
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
      message: "Donation has already been fully redeemed",
    };
  }

  if (
    donationAllocation.maxAmountDrawn !== null &&
    donationAllocation.maxAmountDrawn < amntToPay
  ) {
    return {
      ...errorVal,
      message: "Amount to pay exceeds maximum allowed",
    };
  }

  const amountDrawn = Math.min(
    donationAllocation.maxAmountDrawn ?? availableAmountCents,
    amntToPay,
  );
  const finalAmntToPay = Math.max(0, amntToPay - amountDrawn);

  return {
    finalAmntToPay,
    donationAllocation,
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
