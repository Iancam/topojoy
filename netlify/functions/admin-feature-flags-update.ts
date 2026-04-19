import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import prisma from "../lib/prisma";

const KEY_REGEX = /^[a-z0-9_\-.]{1,128}$/;

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    });

    const userId = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden, user is not admin", 403);
    }

    const body = JSON.parse(event.body || "{}");
    const key = body.key;
    const enabled = body.enabled;

    if (typeof key !== "string" || !KEY_REGEX.test(key)) {
      return error("Invalid flag key", 400);
    }

    if (typeof enabled !== "boolean") {
      return error("Invalid enabled value", 400);
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

    return success(flag);
  } catch (err: any) {
    console.error("admin-feature-flags-update error", err);
    return error(err?.message || "Server error", 500);
  }
};
