import prisma from "../lib/prisma";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const flags = await prisma.featureFlag.findMany({
      select: {
        key: true,
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
      }),
    };
  } catch (error: any) {
    console.error("feature-flags-get error", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error?.message || "Server error" }),
    };
  }
};
