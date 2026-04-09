import prisma from "../lib/prisma";

export const handler = async (event: any) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  const accessToken = event.queryStringParameters?.accessToken;

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing accessToken" }),
    };
  }

  try {
    const donation = await prisma.donation.findUnique({
      where: { accessToken },
      select: {
        id: true,
        amount: true,
        message: true,
        expiryDate: true,
        status: true,
        donor: { select: { name: true } },
        allocations: {
          select: {
            orderId: true,
            amountDrawn: true,
          },
        },
      },
    });

    if (!donation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Gift not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(donation),
    };
  } catch (error: any) {
    console.error("donation-get-gift error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Internal server error",
      }),
    };
  }
};
