import React from "react";
import { z } from "zod";
import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { sendEmail } from "../lib/email";
import { VariantFeedback } from "../emails/VariantFeedback";
import { isProduction } from "../lib/env";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

const bodySchema = z.object({
  parentId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId } = await auth(event, clerkClient);
  if (!userId || !clerkUserId) {
    return error("Unauthorized", 401);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const validated = bodySchema.parse(body);

    const parent = await prisma.mapConfig.findUnique({
      where: { id: validated.parentId },
      select: { userId: true, title: true },
    });

    if (!parent) {
      return error("Submission not found", 404);
    }

    if (parent.userId !== userId) {
      return error("Forbidden", 403);
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const userName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      userEmail;

    const ian = process.env.IAN_EMAIL ?? "hello@topojoy.studio";
    const baseUrl = isProduction()
      ? "https://topojoy.studio"
      : "http://localhost:8888";
    const adminUrl = `${baseUrl}/admin`;

    await sendEmail({
      to: ian,
      subject: `Variant feedback from ${userName} — "${parent.title}"`,
      template: React.createElement(VariantFeedback, {
        userEmail,
        userName,
        message: validated.message,
        adminUrl,
      }),
    });

    return success({ ok: true });
  } catch (err: any) {
    console.error("[variant-message-send] Error:", err);
    return error(err.message || "Failed to send message", 500);
  }
};
