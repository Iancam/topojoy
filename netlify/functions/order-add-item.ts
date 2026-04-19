import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export async function handler(event: any, context: any) {
  const baseUrl = process.env.DEV
    ? "http://localhost:8888"
    : "https://topojoy.studio";
  const userId = await auth(event, clerkClient);
  if (!userId) {
    return error("Unauthorized", 401);
  }
  const {
    // orderId,
    donationAccessToken,
    orderItem: {
      mapConfigId,
      s3Key,
      imageUrl,
      printType,
      subcategoryId,
      width,
      height,
      options,
      quantity,
      itemPrice: userPrice, // in cents
      userContribution,
      filename,
    },
  } = JSON.parse(event.body);

  if (quantity <= 0) {
    return error("Quantity must be greater than 0", 400);
  }

  if (userContribution < 0) {
    return error("User contribution must be greater than or equal to 0", 400);
  }

  if (userContribution > 500000) {
    return error("User contribution must be less than $5000", 400);
  }

  // get official price

  const officialPrices = await fetch(
    `${baseUrl}/.netlify/functions/print-price-post`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [
          {
            subcategoryId: Number(subcategoryId),
            width,
            height,
            options,
          },
        ],
      }),
    },
  ).then((res) => res.json() as Promise<{ price: number }[]>);
  const officialPrice = officialPrices[0].price;

  // get the

  if (userPrice !== officialPrice) {
    // todo, add a log of the price mismatch
    console.error({
      userPrice,
      officialPrice,
    });
    return error("User price does not match official price", 400);
  }

  const orderItem = {
    // orderId is set implicitly by the nested create under order.orderItems
    mapConfig: mapConfigId ? { connect: { id: mapConfigId } } : undefined,
    // s3Key,
    // imageUrl,
    subcategoryId: Number(subcategoryId),
    width,
    height,
    orderItemOptions: options,
    quantity,
    userContribution,
    itemPrice: officialPrice,
    totalPrice: officialPrice * (quantity || 1) + userContribution,
  };

  try {
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: "pending",
      },
    });
    if (!order) {
      const newOrder = await prisma.order.create({
        data: {
          userId,
          totalPrice: orderItem.totalPrice,
          status: "pending",
          orderItems: {
            create: orderItem,
          },
        },
      });
      return success(newOrder);
    }
    const sum = await prisma.orderItem.aggregate({
      where: { orderId: order?.id },
      _sum: { totalPrice: true },
    });
    const newTotal = (sum._sum.totalPrice ?? 0) + orderItem.totalPrice;

    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        totalPrice: newTotal,
        orderItems: {
          create: orderItem,
        },
      },
    });
    return success(updatedOrder);
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
}
