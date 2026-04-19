import prisma from "../lib/prisma";
import { success, error } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return error("Method not allowed", 405);
  }

  try {
    const flags = await prisma.featureFlag.findMany({
      select: {
        key: true,
        enabled: true,
      },
    });

    return success({
      flags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
    });
  } catch (err: any) {
    return error(err?.message || "Server error", 500);
  }
};
