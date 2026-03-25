import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "./prisma";

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
        `${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`,
      ).toString("base64")}`
    : `Basic ${Buffer.from(
        `${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`,
      ).toString("base64")}`;
};

export async function submitOrderToLumaprints(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
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
    throw new Error(`Order ${orderId} not found`);
  }

  if (!order.recipient || !order.orderItems || order.orderItems.length === 0) {
    throw new Error("Order is missing recipient or items");
  }

  if (!order.shippingMethod) {
    throw new Error("Order is missing shippingMethod");
  }

  const recipient = order.recipient;
  const items = order.orderItems;

  const [firstName, ...restName] = (recipient.name || "").split(" ");
  const lastName = restName.join(" ") || "";

  const storeId = parseInt(process.env.LUMAPRINTS_STORE_ID || "20089", 10);

  const orderItems = await Promise.all(
    items.map(async (item) => {
      if (!item.mapConfig?.s3Key) {
        throw new Error(`Order item ${item.id} is missing mapConfig.s3Key`);
      }

      const imageUrl = await getImageUrlFromKey(item.mapConfig.s3Key);
      if (!imageUrl) {
        throw new Error(`No image URL found for item ${item.id}`);
      }

      return {
        externalItemId: item.id,
        subcategoryId: item.subcategoryId,
        quantity: item.quantity,
        width: item.width,
        height: item.height,
        file: { imageUrl },
        orderItemOptions: (item.orderItemOptions as unknown as number[]) || [],
        solidColorHexCode: null,
      };
    }),
  );

  const body = {
    externalId: order.id,
    storeId,
    shippingMethod: order.shippingMethod,
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
    `https://us.${process.env.NODE_ENV === "production" ? "api" : "api-sandbox"}.lumaprints.com/api/v1/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getLumaprintsAuthHeader(),
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Lumaprints order submit error", response.status, text);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        submissionErrorMessage: text.slice(0, 1000),
        submissionErrorAt: new Date(),
      },
    });
    throw new Error(
      `Failed to submit order to Lumaprints: ${response.status} ${text}`,
    );
  }

  const lumaprintsOrder = await response.json();

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  return { order: updatedOrder, lumaprintsOrder };
}
