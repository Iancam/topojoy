import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  try {
    const userId = event.queryStringParameters?.userId || null;
    const configId = event.queryStringParameters?.configId || null;

    // if (!userId) {
    //   return {
    //     statusCode: 400,
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       success: false,
    //       message: "Missing required userId",
    //     }),
    //   };
    // }
    if (!configId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Missing required configId",
        }),
      };
    }

    // TODO: Add auth verification (e.g., Clerk) to ensure the caller is authorized for this userId

    const map = await prisma.mapConfig.findUnique({
      where: { id: configId },
      include: {
        features: true,
        annotations: true,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(map),
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
