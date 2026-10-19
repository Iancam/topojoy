import prisma from "../lib/prisma";
import { success, error } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const q = (event.queryStringParameters?.q || "").trim();
    if (q.length < 1) {
      return success([]);
    }

    const nodes = await prisma.tagNode.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { key: { contains: q.toLowerCase() } },
        ],
      },
      select: { id: true, key: true, name: true, kind: true },
      orderBy: { name: "asc" },
      take: 12,
    });

    return success(nodes);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
