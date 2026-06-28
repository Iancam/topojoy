import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    const { userId, clerkUserId } = await auth(event, clerkClient);
    if (!userId) {
      return error("Unauthorized", 401);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if ((clerkUser.publicMetadata as any)?.role !== "admin") {
      return error("Forbidden", 403);
    }

    const { id } = JSON.parse(event.body || "{}");
    if (!id) {
      return error("Missing required field: id", 400);
    }

    const allocation = await prisma.donationAllocation.findUnique({
      where: { id },
    });

    if (!allocation) {
      return error("Allocation not found", 404);
    }

    if (allocation.amountDrawn > 0) {
      return error("Cannot delete an allocation that has already been used", 400);
    }

    await prisma.donationAllocation.delete({ where: { id } });

    return success({ id });
  } catch (err: any) {
    return error(err.message || "Error deleting allocation", 500);
  }
};
