import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id as string | undefined;
    const userId = body.userId as string | undefined;

    if (!id || !userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Missing id or userId",
        }),
      };
    }

    await prisma.$transaction(async (tx) => {
      const map = await tx.mapConfig.findUnique({ where: { id } });

      if (!map || map.userId !== userId) {
        throw new Error("Map not found or not authorized");
      }

      await tx.feature.deleteMany({ where: { mapConfigId: id } });
      await tx.mapConfig.delete({ where: { id } });
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err: any) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: err.message || "Server error",
      }),
    };
  }
};
