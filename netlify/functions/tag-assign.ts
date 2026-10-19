import { z } from "zod";
import prisma from "../lib/prisma";
import { success, error, auth } from "../lib";
import { createClerkClient } from "@clerk/backend";
import { slugify } from "../lib/validation";

const segmentSchema = z.object({
  name: z.string().trim().min(1).max(128),
  kind: z.string().trim().min(1).max(64).optional(),
});

const bodySchema = z.object({
  mapConfigId: z.string().min(1),
  path: z.array(segmentSchema).min(1).max(10),
});

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId } = await auth(event, clerkClient);
  if (!userId) {
    return error("You must be signed in to tag maps", 401);
  }

  try {
    const { mapConfigId, path } = bodySchema.parse(
      JSON.parse(event.body || "{}"),
    );

    const map = await prisma.mapConfig.findUnique({
      where: { id: mapConfigId },
      select: { id: true, userId: true, collaborators: true, visibility: true },
    });
    if (!map) {
      return error("Map not found", 404);
    }

    if (map.visibility === "private") {
      const clerkUser = await clerkClient.users.getUser(clerkUserId!);
      const isAdmin = (clerkUser.publicMetadata as any)?.role === "admin";
      if (
        map.userId !== userId &&
        !map.collaborators.includes(userId) &&
        !isAdmin
      ) {
        return error("This map is private", 403);
      }
    }

    const nodeIds: string[] = [];

    for (const segment of path) {
      const key = slugify(segment.name);
      if (!key) continue;

      const existing = await prisma.tagNode.findUnique({ where: { key } });
      if (existing) {
        const kind = segment.kind?.toLowerCase();
        if (kind && existing.kind && existing.kind !== kind) {
          await prisma.tagNode.update({
            where: { key },
            data: { suggestedKinds: { push: kind } },
          });
        } else if (kind && !existing.kind) {
          await prisma.tagNode.update({ where: { key }, data: { kind } });
        }
        nodeIds.push(existing.id);
      } else {
        const node = await prisma.tagNode.create({
          data: {
            key,
            name: segment.name.trim(),
            kind: segment.kind?.toLowerCase() ?? null,
            createdById: userId,
          },
        });
        nodeIds.push(node.id);
      }
    }

    if (nodeIds.length === 0) {
      return error("Path contained no usable segments", 400);
    }

    const assignment = await prisma.tagAssignment.create({
      data: {
        userId,
        mapConfigId,
        path: nodeIds,
        nodes: { connect: nodeIds.map((id) => ({ id })) },
      },
      include: { nodes: true },
    });

    return success({
      id: assignment.id,
      path: assignment.path
        .map((id) => assignment.nodes.find((n) => n.id === id)?.name)
        .filter(Boolean),
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return error(`Invalid request: ${err.message}`, 400);
    }
    return error(err.message || "Server error", 500);
  }
};
