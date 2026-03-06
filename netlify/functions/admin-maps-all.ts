import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/index";

const prisma = new PrismaClient();

export const handler = async (event: any) => {
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    });

    const userId = await auth(event, clerkClient);
    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      };
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Forbidden" }),
      };
    }

    const maps = await prisma.mapConfig.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
        s3Key: true,
        userId: true,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maps),
    };
  } catch (err: any) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: err.message || "Server error",
      }),
    };
  }
};
