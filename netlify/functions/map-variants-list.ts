import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId } = await auth(event, clerkClient);
  if (!userId || !clerkUserId) {
    return error("Unauthorized", 401);
  }

  const parentId = event.queryStringParameters?.parentId;
  if (!parentId) {
    return error("Missing parentId", 400);
  }

  try {
    const parent = await prisma.mapConfig.findUnique({
      where: { id: parentId },
      select: { userId: true },
    });

    if (!parent) {
      return error("Not found", 404);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const isAdmin = (clerkUser.publicMetadata as any)?.role === "admin";

    if (!isAdmin && parent.userId !== userId) {
      return error("Forbidden", 403);
    }

    const variants = await prisma.mapConfig.findMany({
      where: { parentId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        s3Key: true,
        status: true,
        createdAt: true,
      },
    });

    return success(variants);
  } catch (err: any) {
    console.error("Error listing variants:", err);
    return error(err.message || "Server error", 500);
  }
};
