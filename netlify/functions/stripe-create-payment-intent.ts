import Stripe from "stripe";
// import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth, getShippingPrice } from "../lib";
import prisma from "../lib/prisma";

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
        body: JSON.stringify({ message: "No address or items found" }),
      };
    }
    const { message, shippingMethods } = await getShippingPrice({
      address: {
        ...address,
        name: address.name,
        phone: address.phone,
        // addressLine1: address.line1,
        // addressLine2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
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
    if (!shippingCostCents) {
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

    if (amount <= 0) {
      console.error("Invalid amount for payment", amount);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid amount for payment" }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
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
        amount,
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
