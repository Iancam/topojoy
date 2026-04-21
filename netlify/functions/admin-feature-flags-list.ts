import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    });

    const { userId, clerkUserId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden, user is not admin", 403);
    }

    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
      select: {
        id: true,
        key: true,
        enabled: true,
        updatedAt: true,
      },
    });

    return success(flags);
  } catch (err: any) {
    return error(err?.message || "Server error", 500);
  }
};
