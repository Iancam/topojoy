import prisma from "../lib/prisma";
import { success, error, auth } from "../lib";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const mapConfigId = event.queryStringParameters?.mapConfigId;
    if (!mapConfigId) {
      return error("Missing mapConfigId", 400);
    }

    const { userId: requesterId } = await auth(event, clerkClient);

    const map = await prisma.mapConfig.findUnique({
      where: { id: mapConfigId },
      select: { userId: true, collaborators: true, visibility: true },
    });
    if (!map) {
      return error("Map not found", 404);
    }
    if (
      map.visibility === "private" &&
      map.userId !== requesterId &&
      !map.collaborators.includes(requesterId || "")
    ) {
      return error("This map is private", 403);
    }

    const assignments = await prisma.tagAssignment.findMany({
      where: { mapConfigId },
      orderBy: { createdAt: "desc" },
      include: {
        nodes: true,
        user: { select: { username: true, name: true } },
      },
    });

    return success(
      assignments.map((a) => ({
        id: a.id,
        mine: a.userId === requesterId,
        taggedBy: a.user.username || a.user.name,
        path: a.path
          .map((id) => a.nodes.find((n) => n.id === id))
          .filter(Boolean)
          .map((n) => ({ id: n!.id, key: n!.key, name: n!.name })),
        createdAt: a.createdAt,
      })),
    );
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
