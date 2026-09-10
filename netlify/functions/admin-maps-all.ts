import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { auth, error, success } from "../lib/index";

const prisma = new PrismaClient();

export const handler = async (event: any) => {
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    });

    const { userId, clerkUserId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden", 403);
    }

    const maps = await prisma.mapConfig.findMany({
      where: { parentId: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
        s3Key: true,
        userId: true,
        status: true,
        giftAccessToken: true,
        user: {
          select: { email: true },
        },
        orderItems: {
          select: { order: { select: { status: true } } },
        },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            filename: true,
            imageUrl: true,
            s3Key: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            orderItems: {
              select: { order: { select: { status: true } } },
            },
          },
        },
      },
    });

    const isPurchased = (orderItems: { order: { status: string } }[]) =>
      orderItems.some((oi) =>
        ["paid", "submitted", "processing"].includes(oi.order.status),
      );

    const result = maps.map((m) => {
      const variants = m.variants.map((v) => ({
        id: v.id,
        title: v.title,
        filename: v.filename,
        imageUrl: v.imageUrl,
        s3Key: v.s3Key,
        variantStatus: v.status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        purchaseStatus: v.orderItems[0]?.order.status || null,
        purchased: isPurchased(v.orderItems),
      }));

      return {
        id: m.id,
        title: m.title,
        filename: m.filename,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        imageUrl: m.imageUrl,
        s3Key: m.s3Key,
        userId: m.userId,
        variantStatus: m.status,
        giftAccessToken: m.giftAccessToken,
        ownerEmail: m.user?.email ?? null,
        variants,
        purchaseStatus: m.orderItems[0]?.order.status || null,
        purchased:
          isPurchased(m.orderItems) || variants.some((v) => v.purchased),
      };
    });

    return success(result);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
