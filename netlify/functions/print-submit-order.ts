import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "../lib";

const prisma = new PrismaClient();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

const s3 = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const getImageUrlFromKey = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  const fiveDays = 60 * 60 * 24 * 5;
  return getSignedUrl(s3, command, { expiresIn: fiveDays });
};

const getLumaprintsAuthHeader = () => {
  return process.env.NODE_ENV === "production"
    ? `Basic ${Buffer.from(
        `${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`
      ).toString("base64")}`
    : `Basic ${Buffer.from(
        `${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`
      ).toString("base64")}`;
};

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const authUserId = await auth(event, clerkClient);
    if (!authUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Find the latest paid order for this user
    const order = await prisma.order.findFirst({
      where: {
        userId: authUserId,
        status: "paid",
      },
      orderBy: { createdAt: "desc" },
      include: {
        recipient: true,
        orderItems: {
          include: {
            mapConfig: true,
          },
        },
      },
    });

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No paid order found" }),
      };
    }

    const recipient = order.recipient;
    const items = order.orderItems;

    if (!recipient || !items || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Order is missing recipient or items",
        }),
      };
    }

    const [firstName, ...restName] = (recipient.name || "").split(" ");
    const lastName = restName.join(" ") || "";

    const storeId = parseInt(process.env.LUMAPRINTS_STORE_ID || "818", 10);

    const orderItems = await Promise.all(
      items.map(async (item) => {
        // Always prefer generating a fresh signed URL from the canonical S3 key
        let imageUrl: string | null = null;
        if (item.mapConfig?.s3Key) {
          imageUrl = await getImageUrlFromKey(item.mapConfig.s3Key);
        } else if (item.imageUrl) {
          imageUrl = item.imageUrl;
        }

        return {
          externalItemId: item.id,
          subcategoryId: item.subcategoryId,
          quantity: item.quantity,
          width: item.width,
          height: item.height,
          file: imageUrl ? { imageUrl } : undefined,
          orderItemOptions:
            (item.orderItemOptions as unknown as number[]) || [],
          solidColorHexCode: null,
        };
      })
    );

    console.log(order.shippingMethod);
    const body = {
      externalId: order.id,
      storeId,
      shippingMethod: order.shippingMethod || "default",
      productionTime: "regular",
      specialInstructions: "Topojoy map print order",
      printouts: orderItems
        .map((oi) => oi.file?.imageUrl)
        .filter((u): u is string => Boolean(u)),
      recipient: {
        firstName,
        lastName,
        addressLine1: recipient.addressLine1,
        addressLine2: recipient.addressLine2 || "",
        city: recipient.city,
        state: recipient.state || "",
        zipCode: recipient.postalCode,
        country: recipient.country,
        phone: recipient.phone || "",
        company: "",
      },
      orderItems,
    };

    const response = await fetch(
      "https://us.api-sandbox.lumaprints.com/api/v1/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getLumaprintsAuthHeader(),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Lumaprints order submit error", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: "Failed to submit order to Lumaprints",
          details: text,
        }),
      };
    }

    const lumaprintsOrder = await response.json();

    // Optionally transition order status so it no longer appears as a cart/pending order
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "submitted",
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ order: updatedOrder, lumaprintsOrder }),
    };
  } catch (error) {
    console.error("print-submit-order error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
