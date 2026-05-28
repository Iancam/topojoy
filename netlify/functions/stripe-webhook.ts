import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";
import { createGiftedMapIfApplicable } from "../lib/giftedMap";
import { initStripe, webhookSecret } from "../lib/stripe";
import { error, success } from "../lib";

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
    include: { orderItems: { select: { mapConfigId: true } } },
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
    await prisma.donation.update({
      where: { id: donationId },
      data: { status: "paid" },
    });
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
