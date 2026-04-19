import { isProduction } from "./env";

export const error = (message: string, status: number = 400) => {
  // Extract the calling function name from the stack trace
  const stack = new Error().stack;
  let functionName = "unknown";

  if (stack) {
    // Parse stack to find the calling function
    // Stack format: "Error\n    at error (...)\n    at handler (...)\n    at ..."
    const lines = stack.split("\n");
    // Skip first 2 lines (Error and this function), get the caller
    if (lines.length > 2) {
      const callerLine = lines[2];
      // Extract function name from patterns like:
      // "at handler (/path/to/file.ts:123:45)"
      // "at Object.handler (/path/to/file.ts:123:45)"
      const match = callerLine.match(/at (?:Object\.)?(\w+)/);
      if (match) {
        functionName = match[1];
      }

      // Also try to extract the filename for better context
      const fileMatch = callerLine.match(/\/([^/]+\.ts):/);
      if (fileMatch) {
        functionName = `${fileMatch[1].replace(".ts", "")}:${functionName}`;
      }
    }
  }

  // Log the error with context
  console.error(`[${functionName}] Error ${status}:`, message);

  return {
    body: JSON.stringify({
      success: false,
      message,
    }),
    status,
    headers: {
      "Content-Type": "application/json",
    },
  };
};

export const success = (data: any, status: number = 200) => {
  return {
    body: JSON.stringify(data),
    status,
    headers: {
      "Content-Type": "application/json",
    },
  };
};

export const auth = async (event: any, clerkClient: any) => {
  const baseUrl = !isProduction()
    ? "http://localhost:8888"
    : "https://topojoy.studio";

  const authorizedParties = !isProduction()
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
  const isProd = isProduction();

  const authHeader = () => {
    return isProd
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
  // console.log(JSON.stringify(body, null, 2));
  const response = await fetch(
    `https://us.${isProd ? "api" : "api-sandbox"}.lumaprints.com/api/v1/pricing/shipping`,
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
