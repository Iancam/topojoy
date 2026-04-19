import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { auth, error, success } from "../lib/index";

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
      return error("Forbidden", 403);
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

    return success(maps);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
