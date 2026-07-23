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
        user: {
          select: { email: true },
        },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            s3Key: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const result = maps.map((m) => ({
      id: m.id,
      title: m.title,
      filename: m.filename,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      imageUrl: m.imageUrl,
      s3Key: m.s3Key,
      userId: m.userId,
      status: m.status,
      ownerEmail: m.user?.email ?? null,
      variants: m.variants,
    }));

    return success(result);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
