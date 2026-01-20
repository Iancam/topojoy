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

    const authHeader = () => {
      return process.env.NODE_ENV === "production"
        ? `Basic ${Buffer.from(`${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`).toString("base64")}`
        : `Basic ${Buffer.from(`${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`).toString("base64")}`;
    };

    const response = await fetch(
      "https://us.api-sandbox.lumaprints.com/api/v1/pricing/shipping",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader(),
        },
        body: JSON.stringify({
          recipient: {
            firstName: address.name,
            lastName: "",
            company: "",
            addressLine1: address.line1,
            addressLine2: address.line2 || "",
            city: address.city,
            state: address.state,
            zipCode: address.postalCode,
            country: address.country,
            phone: address.phone || "",
          },
          orderItems: items.map((item) => ({
            subcategoryId: item.subcategoryId,
            quantity: item.quantity,
            width: item.width,
            height: item.height,
            orderItemOptions: item.options ?? [],
          })),
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Lumaprints shipping error", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: "Failed to fetch shipping options from Lumaprints",
        }),
      };
    }

    const json = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  } catch (error) {
    console.error("print-shipping-post error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
