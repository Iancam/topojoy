import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handler = async (event: HandlerEvent, _context: HandlerContext) => {
  try {
    const userId = event.queryStringParameters?.userId || null;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Missing required userId" }),
      };
    }

    // TODO: Add auth verification (e.g., Clerk) to ensure the caller is authorized for this userId

    const maps = await prisma.mapConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        // Placeholder for future image field
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: maps }),
    };
  } catch (err: any) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: err.message || "Server error" }),
    };
  }
};
