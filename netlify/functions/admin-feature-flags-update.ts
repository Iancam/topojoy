import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";

const KEY_REGEX = /^[a-z0-9_\-.]{1,128}$/;

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
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

    const body = JSON.parse(event.body || "{}");
    const key = body.key;
    const enabled = body.enabled;

    if (typeof key !== "string" || !KEY_REGEX.test(key)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid flag key" }),
      };
    }

    if (typeof enabled !== "boolean") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid enabled value" }),
      };
    }

    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled },
      select: {
        id: true,
        key: true,
        enabled: true,
        updatedAt: true,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(flag),
    };
  } catch (error: any) {
    console.error("admin-feature-flags-update error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error?.message || "Server error" }),
    };
  }
};
