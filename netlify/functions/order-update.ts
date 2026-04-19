import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return error("Unauthorized", 401);
    }

    const rawBody = JSON.parse(event.body || "{}");
    const { address, ...rest } = rawBody as {
      address?: {
        name: string;
        email?: string;
        phone?: string;
        line1: string;
        line2?: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
      };
      shippingMethod?: string;
      [key: string]: any;
    };

    // Find the user's pending order; don't trust arbitrary order IDs from client
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: authUserId,
        status: "pending",
      },
    });

    if (!existingOrder) {
      return error("No pending order found", 404);
    }

    let recipientId = existingOrder.recipientId || undefined;

    // If a shipping address was provided, persist it to the Recipient model
    if (address) {
      const recipient = await prisma.recipient.create({
        data: {
          name: address.name,
          email: address.email || null,
          phone: address.phone || null,
          addressLine1: address.line1,
          addressLine2: address.line2 || null,
          city: address.city,
          state: address.state || null,
          postalCode: address.postalCode,
          country: address.country,
        },
      });
      recipientId = recipient.id;
    }

    // Whitelist order fields we allow updating via this endpoint
    const updateData: any = {};
    if (typeof rest.shippingMethod === "string") {
      updateData.shippingMethod = rest.shippingMethod;
    }
    if (rest.status === "cancelled") {
      updateData.status = rest.status;
    }
    if (recipientId) {
      updateData.recipientId = recipientId;
    }

    if (Object.keys(updateData).length === 0) {
      // Nothing to update; return current order
      return success(existingOrder);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
    });

    return success(updatedOrder);
  } catch (err: any) {
    console.error("order-update error", err);
    return error("Internal server error", 500);
  }
};
