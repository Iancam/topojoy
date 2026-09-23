import { z } from "zod";
import { createClerkClient } from "@clerk/backend";
import React from "react";
import prisma from "../lib/prisma";
import { auth, error, success } from "../lib";
import { sendEmail } from "../lib/email";
import { MapSubmissionNotification } from "../emails/MapSubmissionNotification";
import { MapSubmissionConfirmation } from "../emails/MapSubmissionConfirmation";
import { isProduction } from "../lib/env";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

const reflectionSchema = z.object({
  question: z.string().optional(),
  answer: z.string().optional(),
});

const bodySchema = z.object({
  title: z.string().min(1),
  bbox: z.any(),
  selectedTrails: z.any().optional(),
  formData: z.record(z.any()).optional(),
  reflections: z.array(reflectionSchema).optional().default([]),
  message: z.string().optional(),
});

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const { userId, clerkUserId, user } = await auth(event, clerkClient);

  if (!userId || !clerkUserId) {
    return error("Unauthorized", 401);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const validated = bodySchema.parse(body);

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const userName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      userEmail;

    const mapConfig = await prisma.$transaction(async (tx) => {
      const cfg = await tx.mapConfig.create({
        data: {
          userId,
          title: validated.title,
          config: "Original",
          filename: `submission-${Date.now()}`,
          zoomLevel: 12,
          curveDensity: 5,
          bbox: validated.bbox ?? {},
          selectedTrails: validated.selectedTrails ?? [],
          backgroundTextGroups: [],
          backgroundTextHighContrast: true,
          backgroundTextContrast: 7.5,
          crossHatch: false,
          colorPlan: "-0.1,0.02,0.25,0.5,0.7,0.7,0.9,0.9,Infinity",
          status: "submitted",
        },
      });

      if (validated.reflections.length > 0) {
        await tx.reflection.createMany({
          data: validated.reflections.map((r) => ({
            question: r.question,
            answer: r.answer,
            mapConfigId: cfg.id,
          })),
        });
      }

      return cfg;
    });

    const baseUrl = isProduction()
      ? "https://topojoy.studio"
      : "http://localhost:8888";

    const editorUrl = `${baseUrl}/app?configId=${mapConfig.id}`;
    const ian = process.env.IAN_EMAIL ?? "hello@topojoy.studio";

    const who = validated.reflections.find((r) =>
      r.question?.toLowerCase().includes("who"),
    )?.answer;
    const why = validated.reflections.find((r) =>
      r.question?.toLowerCase().includes("why"),
    )?.answer;

    console.log(
      `[submission] Sending notification to ${ian} for map ${mapConfig.id}`,
    );
    try {
      await sendEmail({
        to: ian,
        subject: `New map submission: "${validated.title}" from ${userName}`,
        template: React.createElement(MapSubmissionNotification, {
          userEmail,
          userName,
          mapTitle: validated.title,
          editorUrl,
          who,
          why,
          message: validated.message,
        }),
      });
      console.log(`[submission] Notification sent successfully`);
    } catch (emailErr: any) {
      console.error(
        "[submission] Email failed (map was still saved):",
        emailErr,
      );
    }

    if (userEmail) {
      const adviceUrl = `${baseUrl}/blog/giving-advice`;
      console.log(
        `[submission] Sending confirmation to ${userEmail} for map ${mapConfig.id}`,
      );
      try {
        await sendEmail({
          to: userEmail,
          subject: `We received your map submission: "${validated.title}"`,
          template: React.createElement(MapSubmissionConfirmation, {
            userName,
            mapTitle: validated.title,
            adviceUrl,
          }),
        });
        console.log(`[submission] Confirmation email sent successfully`);
      } catch (emailErr: any) {
        console.error(
          "[submission] Confirmation email failed (map was still saved):",
          emailErr,
        );
      }
    }

    return success({ id: mapConfig.id });
  } catch (err: any) {
    console.error("Error creating map submission:", err);
    return error(err.message || "Failed to create submission", 500);
  }
};
