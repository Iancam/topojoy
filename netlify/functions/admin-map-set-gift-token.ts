import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId, clerkUserId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden", 403);
    }

    const body = JSON.parse(event.body || "{}");
    const { mapId } = body;
    const giftAccessToken =
      typeof body.giftAccessToken === "string"
        ? body.giftAccessToken.trim() || null
        : null;

    if (!mapId || typeof mapId !== "string") {
      return error("Missing required field: mapId", 400);
    }

    const map = await prisma.mapConfig.findUnique({ where: { id: mapId } });
    if (!map) {
      return error("Map not found", 404);
    }

    // Validate the token corresponds to a real donation allocation so typos
    // are caught immediately instead of silently failing at checkout.
    if (giftAccessToken) {
      const allocation = await prisma.donationAllocation.findUnique({
        where: { accessToken: giftAccessToken },
      });
      if (!allocation) {
        return error("No donation allocation found for that gift code", 400);
      }
    }

    const updated = await prisma.mapConfig.update({
      where: { id: mapId },
      data: { giftAccessToken },
    });

    return success({ id: updated.id, giftAccessToken: updated.giftAccessToken });
  } catch (err: any) {
    console.error("[admin-map-set-gift-token] Error:", err);
    return error(err.message || "Failed to set gift token", 500);
  }
};
