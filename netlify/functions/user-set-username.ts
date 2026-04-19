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

    // Ensure normalized username is not empty
    if (!normalizedUsername || normalizedUsername.trim() === "") {
      return error("Username cannot be empty after normalization", 400);
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findFirst({
      where: { username: normalizedUsername },
    });

    if (existingUser && existingUser.clerkId !== clerkUserId) {
      return error(
        "Username is already taken. Please choose a different one.",
        409,
      );
    }

    // Update or create user with username
    const user = await prisma.user.update({
      where: { clerkId: clerkUserId },
      data: { username: normalizedUsername },
    });

    return success({ username: user.username });
  } catch (err: any) {
    console.error("Error setting username:", err);

    // Handle validation errors
    if (err.name === "ZodError") {
      return error(
        err.errors?.map((e: any) => e.message).join(", ") || "Invalid username",
        400,
      );
    }

    return error(err.message || "Failed to update username", 500);
  }
};
