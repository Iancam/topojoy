import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { success, error } from "../lib";

const prisma = new PrismaClient();

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  try {
    const userId = event.queryStringParameters?.userId || null;

    if (!userId) {
      return error("Missing required userId", 400);
    }

    // TODO: Add auth verification (e.g., Clerk) to ensure the caller is authorized for this userId

    const maps = await prisma.mapConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
        s3Key: true,
        // Placeholder for future image field
      },
    });

    return success(maps);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
