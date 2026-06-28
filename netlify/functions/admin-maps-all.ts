import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { auth, error, success } from "../lib/index";

const prisma = new PrismaClient();

export const handler = async (event: any) => {
  console.log("ping");
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
      },
    });
    console.log(maps);
    return success(maps);
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
