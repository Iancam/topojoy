import { z } from "zod";
import prisma from "../lib/prisma";
import { success, error, auth } from "../lib";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId } = await auth(event, clerkClient);
  if (!userId || !clerkUserId) {
    return error("You must be signed in", 401);
  }

  try {
    const { id, visibility } = z
      .object({
        id: z.string().min(1),
        visibility: z.enum(["public", "private"]),
      })
      .parse(JSON.parse(event.body || "{}"));

    const map = await prisma.mapConfig.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!map) {
      return error("Map not found", 404);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const isAdmin = (clerkUser.publicMetadata as any)?.role === "admin";
    if (map.userId !== userId && !isAdmin) {
      return error("Only the map owner can change its visibility", 403);
    }

    const updated = await prisma.mapConfig.update({
      where: { id },
      data: { visibility },
      select: { id: true, visibility: true },
    });

    return success(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return error(`Invalid request: ${err.message}`, 400);
    }
    return error(err.message || "Server error", 500);
  }
};
