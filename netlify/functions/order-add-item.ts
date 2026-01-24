import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
const prisma = new PrismaClient();
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
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  const {
    orderId,
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
            subcategoryId,
            width,
            height,
            options,
          },
        ],
      }),
    }
  ).then((res) => res.json() as Promise<{ price: number }[]>);
  console.log({ officialPrices });
  const officialPrice = officialPrices[0].price;
  if (userPrice !== officialPrice) {
    // todo, add a log of the price mismatch
    console.error({
      userPrice,
      officialPrice,
    });
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "User price does not match official price",
      }),
    };
  }

  const orderItem = {
    // orderId is set implicitly by the nested create under order.orderItems
    mapConfig: mapConfigId ? { connect: { id: mapConfigId } } : undefined,
    // s3Key,
    // imageUrl,
    subcategoryId,
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
      return { statusCode: 200, body: JSON.stringify(newOrder) };
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
    return { statusCode: 200, body: JSON.stringify(updatedOrder) };
  } catch (error) {
    console.log(error);
    return { statusCode: 500, body: JSON.stringify({ error }) };
  }
}
