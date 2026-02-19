export const auth = async (event: any, clerkClient: any) => {
  const baseUrl = process.env.DEV
    ? "http://localhost:8888"
    : "https://topojoy.studio";

  const authorizedParties = process.env.DEV
    ? ["http://localhost:8888"]
    : ["https://topojoy.studio", "https://topojoy.netlify.app"];

  const method = (event.httpMethod || "").toUpperCase();

  const clerkRequest: any = {
    url: `${baseUrl}${event.path}${event.rawQuery ? `?${event.rawQuery}` : ""}`,
    method,
    headers: event.headers,
  };

  // Clerk (via undici/Request) does not allow a body on GET/HEAD requests.
  if (method !== "GET" && method !== "HEAD" && event.body) {
    clerkRequest.body = event.body;
  }

  // try {
    const auth = await clerkClient.authenticateRequest(clerkRequest, {
      authorizedParties,
    });

    if (!auth.isAuthenticated) {
      return null;
    }

    const { userId } = auth.toAuth();
    return userId;
  // } catch (err) {
    console.error("Clerk authenticateRequest failed", err);
    // On any Clerk error, treat as unauthenticated instead of crashing the function.
    return null;
  }
};

export const getShippingPrice = async ({
  address,
  items,
}: {
  address: any;
  items: {
    subcategoryId: string | number;
    width: number;
    height: number;
    options: number[];
    quantity: number;
  }[];
}) => {
  const authHeader = () => {
    return process.env.NODE_ENV === "production"
      ? `Basic ${Buffer.from(`${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`).toString("base64")}`
      : `Basic ${Buffer.from(`${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`).toString("base64")}`;
  };

  const body = {
    recipient: {
      firstName: address.name,
      lastName: address.lastName || "",
      company: address.company || "",
      addressLine1: address.line1 || address.addressLine1,
      addressLine2: address.line2 || address.addressLine2 || "",
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
  };
  const response = await fetch(
    `https://us.${process.env.NODE_ENV === "production" ? "api" : "api-sandbox"}.lumaprints.com/api/v1/pricing/shipping`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lumaprints shipping error: ${response.status} ${text}`);
  }

  const json = await response.json();
  return json;
};
