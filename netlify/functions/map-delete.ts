import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { success, error } from "../lib";

const prisma = new PrismaClient();

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== "POST") {
    return error("Method Not Allowed", 405);
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id as string | undefined;
    const userId = body.userId as string | undefined;

    if (!id || !userId) {
      return error("Missing id or userId", 400);
    }

    await prisma.$transaction(async (tx) => {
      const map = await tx.mapConfig.findUnique({ where: { id } });

      if (!map || map.userId !== userId) {
        throw new Error("Map not found or not authorized");
      }

      await tx.feature.deleteMany({ where: { mapConfigId: id } });
      await tx.mapConfig.delete({ where: { id } });
    });

    return success({ deleted: true });
  } catch (err: any) {
    console.error(err);
    return error(err.message || "Server error", 500);
  }
};
