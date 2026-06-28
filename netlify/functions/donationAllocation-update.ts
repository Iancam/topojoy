import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { orderId, accessToken, id } = body;

    if (!accessToken && !id) {
      return error(
        "Missing required fields: " +
          (!accessToken ? "accessToken" : "") +
          " or " +
          (!id ? "id" : ""),
        400,
      );
    }
    const whereClause = {
      where: { ...(id ? { id } : { accessToken }) },
    };

    const donationAllocation = await prisma.donationAllocation.update({
      ...whereClause,
      data: {
        orderId,
      },
    });

    return success({ donationAllocation });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
