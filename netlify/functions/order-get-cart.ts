import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";

const prisma = new PrismaClient();
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  const authUserId = await auth(event, clerkClient);
  if (!authUserId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  // const { userId } = JSON.parse(event.body);
  const order = await prisma.order.findFirst({
    where: {
      userId: authUserId,
      status: "pending",
    },
    include: {
      orderItems: {
        include: {
          mapConfig: {
            select: { id: true, title: true, filename: true, s3Key: true },
          },
        },
      },
    },
  });

  if (!order) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "No pending order found" }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(order),
  };
};
