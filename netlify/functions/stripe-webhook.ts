import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";
import { createGiftedMapIfApplicable } from "../lib/giftedMap";
import { initStripe, webhookSecret } from "../lib/stripe";
import { error, success } from "../lib";
import { sendEmail } from "../lib/email";
import React from "react";
import { OrderConfirmation } from "../emails/OrderConfirmation";
import { DonationConfirmation } from "../emails/DonationConfirmation";

const stripe = initStripe();
export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const sig =
    event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const rawBody = event.body || "";

  let stripeEvent = JSON.parse(event.body || "null");

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig as string,
      webhookSecret,
    );
  } catch (err: any) {
    return error("stripe-webhook signature verification failed", 400);
  }
  try {
    const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    const donationId = paymentIntent.metadata?.donationId;

    if (stripeEvent.type === "payment_intent.succeeded") {
      await handleOrder(orderId, paymentIntent);
      await handleDonation(donationId, paymentIntent);
    } else if (stripeEvent.type === "payment_intent.payment_failed") {
      await handleOrderFailed(orderId, paymentIntent);
      await handleDonationFailed(donationId, paymentIntent);
    } else if (stripeEvent.type === "charge.refunded") {
      const charge = stripeEvent.data.object as Stripe.Charge;

      await handleOrderRefunded(orderId, charge);
      // await handleDonationRefunded(donationId, charge);
    }

    return success({ received: true });
  } catch (err) {
    return error("Internal server error", 500);
  }
};

async function handleOrder(
  orderId: string | undefined,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (!orderId) {
    return;
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      recipient: true,
      orderItems: { include: { mapConfig: { select: { title: true } } } },
      user: { select: { email: true, name: true } },
    },
  });
  if (!order) {
    console.warn("Order not found for payment_intent", {
      orderId,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }
  if (order.status !== "paid" && order.status !== "submitted") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "paid", paidAt: new Date() },
    });

    await submitOrderToLumaprints(orderId);

    const allocation = await prisma.donationAllocation.findFirst({
      where: { orderId },
      include: { donation: { select: { donorId: true } } },
    });

    if (allocation?.donation.donorId) {
      await createGiftedMapIfApplicable({
        donorId: allocation.donation.donorId,
        orderId,
        orderItems: order.orderItems,
        totalCost: order.totalPrice,
      });
    }

    const recipientEmail = order.recipient?.email ?? order.user?.email;
    const recipientName = order.recipient?.name ?? order.user?.name ?? "there";
    if (recipientEmail) {
      const formatMoney = (cents: number) =>
        (cents / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
      await sendEmail({
        to: recipientEmail,
        subject: "Your TopoJoy order is confirmed",
        template: React.createElement(OrderConfirmation, {
          recipientName,
          items: order.orderItems.map((item) => ({
            title: item.mapConfig?.title ?? "",
            printType: `#${item.subcategoryId}`,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            priceFormatted: formatMoney(item.totalPrice),
          })),
          totalFormatted: formatMoney(order.totalPrice),
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
      }).catch((e) => console.error("[email] Order confirmation failed:", e));
    }
  }
}

async function handleDonation(
  donationId: string | undefined,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (!donationId) {
    return;
  }
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
  });
  if (!donation) {
    console.warn("Donation not found for payment_intent", {
      donationId,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }
  if (donation.status !== "paid") {
    const updatedDonation = await prisma.donation.update({
      where: { id: donationId },
      data: { status: "paid" },
      include: { donor: { select: { email: true, name: true } } },
    });

    const donorEmail = updatedDonation.donor?.email;
    const donorName = updatedDonation.donor?.name ?? "there";
    if (donorEmail) {
      const formatMoney = (cents: number) =>
        (cents / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
      const BASE_URL = "https://topojoy.studio";
      const giftLinkUrl = updatedDonation.accessToken
        ? `${BASE_URL}/gift/${updatedDonation.accessToken}`
        : `${BASE_URL}/donate`;
      await sendEmail({
        to: donorEmail,
        subject: "Your TopoJoy gift is ready",
        template: React.createElement(DonationConfirmation, {
          donorName,
          amountFormatted: formatMoney(updatedDonation.amount),
          giftLinkUrl,
          message: updatedDonation.message ?? undefined,
        }),
      }).catch((e) =>
        console.error("[email] Donation confirmation failed:", e),
      );
    }
  }
}

async function handleOrderFailed(
  orderId: string | undefined,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (!orderId) {
    return;
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.warn("Order not found for payment_intent", {
      orderId,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }
  if (order.status === "pending") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "failed" },
    });
  }
}

async function handleDonationFailed(
  donationId: string | undefined,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (!donationId) {
    return;
  }
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
  });
  if (!donation) {
    console.warn("Donation not found for payment_intent", {
      donationId,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }
  if (donation.status === "pending") {
    await prisma.donation.update({
      where: { id: donationId },
      data: { status: "failed" },
    });
  }
}

async function handleOrderRefunded(
  orderId: string | undefined,
  charge: Stripe.Charge,
) {
  if (!orderId) {
    return;
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.warn("Order not found for charge.refunded", {
      orderId,
      chargeId: charge.id,
    });
    return;
  }
  if (order.status === "paid") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "refunded" },
    });
  }
}
