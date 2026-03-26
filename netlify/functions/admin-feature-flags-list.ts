import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    });

    const userId = await auth(event, clerkClient);
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden, user is not admin" }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify(flags),
    };
  } catch (error: any) {
    console.error("admin-feature-flags-list error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error?.message || "Server error" }),
    };
  }
};
