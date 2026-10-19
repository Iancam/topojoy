import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { success, error } from "../lib";

const prisma = new PrismaClient();

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  try {
    const clerkId = event.queryStringParameters?.userId || null;
    // user id is clerk user,
    if (!clerkId) {
      return error("Missing required userId", 400);
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    // TODO: Add auth verification (e.g., Clerk) to ensure the caller is authorized for this userId

    const maps = await prisma.mapConfig.findMany({
      where: { userId: user?.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
        s3Key: true,
        visibility: true,
        // Placeholder for future image field
      },
    });

    return success(maps);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
