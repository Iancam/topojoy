import { createClerkClient } from "@clerk/backend";
import { auth, error, success } from "../lib";
import prisma from "../lib/prisma";
import { sendEmail } from "../lib/email";
import React from "react";
import { GratitudeMessage } from "../emails/GratitudeMessage";
import { GratitudeReply } from "../emails/GratitudeReply";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId } = await auth(event, clerkClient);
  if (!userId) {
    return error("Unauthorized", 401);
  }

  const body = JSON.parse(event.body || "{}");
  const { giftedMapId, message, reflection } = body;

  if (!giftedMapId) {
    return error("Missing giftedMapId", 400);
  }

  if (typeof message !== "string" && typeof reflection !== "string") {
    return error("At least one of message or reflection must be provided", 400);
  }

  try {
    const giftedMap = await prisma.giftedMap.findUnique({
      where: { id: giftedMapId },
      select: {
        giftGiverId: true,
        recipientId: true,
        orderId: true,
        mapConfig: { select: { title: true } },
        giftGiver: { select: { email: true, name: true } },
        recipient: { select: { email: true, name: true } },
      },
    });

    if (!giftedMap) {
      return error("GiftedMap not found", 404);
    }

    // Determine role — also allow the order owner as the recipient
    // if recipientId hasn't been set yet
    let role: "giver" | "recipient" | null = null;

    if (giftedMap.giftGiverId === userId) {
      role = "giver";
    } else if (giftedMap.recipientId === userId) {
      role = "recipient";
    } else {
      const order = await prisma.order.findUnique({
        where: { id: giftedMap.orderId },
        select: { userId: true },
      });
      if (order?.userId === userId) {
        role = "recipient";
      }
    }

    if (!role) {
      return error("Forbidden", 403);
    }

    const updateData =
      role === "giver"
        ? {
            giverMessage: typeof message === "string" ? message : undefined,
            giverReflection:
              typeof reflection === "string" ? reflection : undefined,
          }
        : {
            recipientMessage: typeof message === "string" ? message : undefined,
            recipientReflection:
              typeof reflection === "string" ? reflection : undefined,
            // Stamp the recipientId so future lookups are fast
            recipientId: userId,
          };

    const updated = await prisma.giftedMap.update({
      where: { id: giftedMapId },
      data: updateData,
      select: {
        id: true,
        giverMessage: true,
        giverReflection: true,
        recipientMessage: true,
        recipientReflection: true,
      },
    });

    // send email notification
    // await sendEmailNotification(giftedMap, role, message, userId);

    return success({ ...updated, role });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};

async function sendEmailNotification(
  giftedMap: any,
  role: string,
  message: string,
  userId: string,
) {
  const BASE_URL = "https://topojoy.studio";
  const reflectionUrl = `${BASE_URL}/user/gifts-received`;
  const mapTitle = giftedMap.mapConfig?.title ?? undefined;

  if (role === "giver" && typeof message === "string" && message.trim()) {
    // Giver wrote a message → notify the recipient
    const recipientUser =
      giftedMap.recipient ??
      (giftedMap.recipientId
        ? await prisma.user.findUnique({
            where: { id: giftedMap.recipientId },
            select: { email: true, name: true },
          })
        : null);
    const recipientEmail = recipientUser?.email;
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: `${giftedMap.giftGiver.name} left you a message on your TopoJoy map`,
        template: React.createElement(GratitudeMessage, {
          recipientName: recipientUser?.name ?? "there",
          giverName: giftedMap.giftGiver.name,
          message,
          mapTitle,
          reflectionUrl,
        }),
      }).catch((e: any) =>
        console.error("[email] GratitudeMessage send failed:", e),
      );
    }
  } else if (
    role === "recipient" &&
    typeof message === "string" &&
    message.trim()
  ) {
    // Recipient replied → notify the giver
    const giverEmail = giftedMap.giftGiver.email;
    if (giverEmail) {
      const recipientName =
        giftedMap.recipient?.name ??
        (
          await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
          })
        )?.name ??
        "the recipient";
      await sendEmail({
        to: giverEmail,
        subject: `${recipientName} replied to your TopoJoy gift`,
        template: React.createElement(GratitudeReply, {
          giverName: giftedMap.giftGiver.name,
          recipientName,
          message,
          mapTitle,
          reflectionUrl: `${BASE_URL}/user/gifts-sent`,
        }),
      }).catch((e: any) =>
        console.error("[email] GratitudeReply send failed:", e),
      );
    }
  }
}
