import { getShippingPrice } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const { address, items } = JSON.parse(event.body || "{}") as {
      address: {
        name: string;
        phone?: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      items: {
        subcategoryId: string | number;
        width: number;
        height: number;
        options: number[];
        quantity: number;
      }[];
    };

    console.log("address", address);
    console.log("items", items);

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing address or items" }),
      };
    }

    const shippingPrices = await getShippingPrice({ address, items });
    return {
      statusCode: 200,
      body: JSON.stringify(shippingPrices),
    };
  } catch (error) {
    console.error("print-shipping-post error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
