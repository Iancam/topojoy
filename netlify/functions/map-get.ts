import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { success, error } from "../lib";

const prisma = new PrismaClient();

export const input = z.object({
  userId: z.string(),
  configId: z.string(),
});

export const output = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  features: z.array(z.any()),
  annotations: z.array(z.any()),
});

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  try {
    const userId = event.queryStringParameters?.userId || null;
    const configId = event.queryStringParameters?.configId || null;
    const username = event.queryStringParameters?.username || null;
    const filename = event.queryStringParameters?.filename || null;

    // Support two lookup methods:
    // 1. By configId (legacy)
    // 2. By username + filename (new pretty URLs)
    let map;

    if (username && filename) {
      // Look up by username and filename
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return error("User not found", 404);
      }

      map = await prisma.mapConfig.findUnique({
        where: {
          filename_userId: {
            filename,
            userId: user.id,
          },
        },
        include: {
          features: true,
          annotations: true,
        },
      });
    } else if (configId) {
      // Look up by configId
      map = await prisma.mapConfig.findUnique({
        where: { id: configId },
        include: {
          features: true,
          annotations: true,
        },
      });
    } else {
      return error(
        "Missing required parameters. Provide either configId or (username + filename)",
        400,
      );
    }

    if (!map) {
      return error("Map not found", 404);
    }

    // Check if the user can edit this map
    // User can edit if they are:
    // 1. The owner (userId matches map.userId)
    // 2. A collaborator (userId is in map.collaborators array)
    const canEdit = userId
      ? userId === map.userId || map.collaborators.includes(userId)
      : false;

    return success({
      ...map,
      canEdit,
    });
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
