import Stripe from "stripe";
import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import prisma from "../lib/prisma";
import { submitOrderToLumaprints } from "../lib/lumaprints";

const stripeSecretKey = process.env.SBX_STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("SBX_STRIPE_SECRET_KEY is not set");
}

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey);

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
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
    console.error(
      "stripe-webhook signature verification failed",
      err?.message || err,
    );
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Webhook signature verification failed",
      }),
    };
  }

  console.log("stripeEvent.type", stripeEvent.type);
  try {
    if (stripeEvent.type === "payment_intent.succeeded") {
      const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      console.log("orderId", orderId);
      if (!orderId) {
        console.warn(
          "payment_intent.succeeded missing orderId metadata",
          paymentIntent.id,
        );
        // await stripe.paymentIntents.cancel(paymentIntent.id);
      } else {
        const order = await prisma.order.findUnique({ where: { id: orderId } });

        console.log("order", order);

        if (!order) {
          console.warn("Order not found for payment_intent", {
            orderId,
            paymentIntentId: paymentIntent.id,
          });
        } else if (order.status !== "paid" && order.status !== "submitted") {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "paid" },
          });

          await submitOrderToLumaprints(orderId);
        }
      }
    } else if (stripeEvent.type === "payment_intent.payment_failed") {
      const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        console.warn(
          "payment_intent.payment_failed missing orderId metadata",
          paymentIntent.id,
        );
      } else {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          console.warn("Order not found for failed payment_intent", {
            orderId,
            paymentIntentId: paymentIntent.id,
          });
        } else if (order.status === "pending") {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "failed" },
          });
        }
      }
    } else if (stripeEvent.type === "charge.refunded") {
      const charge = stripeEvent.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId;

      if (!orderId) {
        console.warn("charge.refunded missing orderId metadata", charge.id);
      } else {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          console.warn("Order not found for charge.refunded", {
            orderId,
            chargeId: charge.id,
          });
        } else {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "refunded" },
          });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error("stripe-webhook handler error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
