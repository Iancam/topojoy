import { getShippingPrice } from "../lib";
import { error, success } from "../lib";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
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

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return error("Missing address or items", 400);
    }

    const shippingPrices = await getShippingPrice({ address, items });
    return success(shippingPrices);
  } catch (err: any) {
    return error(err.message ?? "Internal server error", 500);
  }
};
