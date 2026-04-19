import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClerkClient } from "@clerk/backend";
import { auth, success, error } from "../lib";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { usernameSchema, slugify } from "../lib/validation";

const prisma = new PrismaClient();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

const requestSchema = z.object({
  username: usernameSchema,
});

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  try {
    // Authenticate user with Clerk
    const clerkUserId = await auth(event, clerkClient);

    if (!clerkUserId) {
      return error("Unauthorized - please sign in", 401);
    }

    const body = JSON.parse(event.body || "{}");
    const { username } = requestSchema.parse(body);

    // Normalize username to URL-friendly slug
    const normalizedUsername = slugify(username);

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser && existingUser.clerkId !== clerkUserId) {
      return error(
        "Username is already taken. Please choose a different one.",
        409,
      );
    }

    // Update or create user with username
    const user = await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: { username: normalizedUsername },
      create: {
        clerkId: clerkUserId,
        username: normalizedUsername,
        name: "User", // Default name, should be updated from Clerk data
      },
    });

    return success({ username: user.username });
  } catch (error: any) {
    console.error("Error setting username:", error);

    // Handle validation errors
    if (error.name === "ZodError") {
      return error(error.errors[0]?.message || "Invalid username", 400);
    }

    return error(error.message || "Failed to update username", 500);
  }
};
