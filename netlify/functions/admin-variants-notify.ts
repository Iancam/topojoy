import React from "react";
import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { sendEmail } from "../lib/email";
import { VariantsReady } from "../emails/VariantsReady";
import { isProduction } from "../lib/env";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId } = await auth(event, clerkClient);
  if (!userId || !clerkUserId) {
    return error("Unauthorized", 401);
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  if ((clerkUser.publicMetadata as any)?.role !== "admin") {
    return error("Forbidden", 403);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const mapId = body.mapId;

    if (!mapId || typeof mapId !== "string") {
      return error("Missing required field: mapId", 400);
    }

    const map = await prisma.mapConfig.findUnique({
      where: { id: mapId },
      select: {
        title: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!map) {
      return error("Map not found", 404);
    }

    if (!map.user?.email) {
      return error("Submitter has no email on file", 400);
    }

    const baseUrl = isProduction()
      ? "https://topojoy.studio"
      : "http://localhost:8888";
    const chooseUrl = `${baseUrl}/choose/${mapId}`;

    await sendEmail({
      to: map.user.email,
      subject: `Your variants for "${map.title}" are ready`,
      template: React.createElement(VariantsReady, {
        userName: map.user.name,
        mapTitle: map.title,
        chooseUrl,
      }),
    });

    return success({ ok: true });
  } catch (err: any) {
    console.error("[admin-variants-notify] Error:", err);
    return error(err.message || "Failed to send notification", 500);
  }
};
