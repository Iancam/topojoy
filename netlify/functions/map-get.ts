import { createClerkClient } from "@clerk/backend";
import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { success, error, auth } from "../lib";

const prisma = new PrismaClient();

export const input = z.object({
  userId: z.string(),
  configId: z.string(),
});

export const output = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  features: z.array(z.any()),
  annotations: z.array(z.any()),
});

const buildLegacyFormJson = (map: any) => {
  const colorPlanHeights = (map.colorPlan || "")
    .split(",")
    .filter((v: string) => v !== "")
    .map(Number);
  const backgroundTextGroups = Array.isArray(map.backgroundTextGroups)
    ? map.backgroundTextGroups
    : map.backgroundText
      ? [
          {
            text: map.backgroundText || "",
            elevationRange: [
              map.backgroundTextElevationRange0 ?? 0.7,
              map.backgroundTextElevationRange1 ?? 1,
            ],
            bbox: [0, 0, 0, 0],
          },
        ]
      : [];
  return {
    "title.text": map.title || "",
    filename: map.filename,
    zoomLevel: map.zoomLevel,
    "curve.density": map.curveDensity,
    "backgroundText.groups": backgroundTextGroups,
    "backgroundText.highContrast": map.backgroundTextHighContrast,
    "backgroundText.contrast": map.backgroundTextContrast,
    crossHatch: map.crossHatch,
    ...colorPlanHeights.reduce((obj: any, h: number, i: number) => {
      obj[`colorPlan.${i}.height`] = h;
      return obj;
    }, {}),
    eleVis: map.eleVis,
    textSizeMultiplier: map.textSizeMultiplier,
    "legend.enabled": map.legendEnabled,
    forceCollisionDetection: map.forceCollisionDetection,
  };
};

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  });

  const { userId: authUserId, clerkUserId } = await auth(event, clerkClient);
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const isAdmin = (clerkUser.publicMetadata as any)?.role !== "admin";

  try {
    const paramUserId = event.queryStringParameters?.userId || null;
    const configId = event.queryStringParameters?.configId || null;
    const username = event.queryStringParameters?.username || null;
    const filename = event.queryStringParameters?.filename || null;

    const pSelection = {
      id: true,
      userId: true,
      filename: true,
      title: true,
      config: true,
      zoomLevel: true,
      curveDensity: true,
      formJson: true,
      bbox: true,
      selectedTrails: true,
      backgroundTextGroups: true,
      backgroundTextHighContrast: true,
      backgroundTextContrast: true,
      crossHatch: true,
      colorPlan: true,
      eleVis: true,
      textSizeMultiplier: true,
      legendEnabled: true,
      forceCollisionDetection: true,
      imageUrl: true,
      s3Key: true,
      giftAccessToken: true,
      collaborators: true,
      parentId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      features: { select: { name: true, selected: true, type: true } },
      annotations: {
        select: {
          text: true,
          fontSize: true,
          color: true,
          xRatio: true,
          yRatio: true,
        },
      },
    };

    // Support two lookup methods:
    // 1. By configId (legacy)
    // 2. By username + filename (new pretty URLs)
    let map;

    if (username && filename) {
      // Look up by username and filename
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return error("User not found", 404);
      }

      map = await prisma.mapConfig.findUnique({
        where: {
          filename_userId: {
            filename,
            userId: user.id,
          },
        },
        select: pSelection,
      });
    } else if (configId) {
      // Look up by configId
      map = await prisma.mapConfig.findUnique({
        where: { id: configId },
        select: pSelection,
      });
      console.log("map parent id", map?.parentId);
    } else {
      return error(
        "Missing required parameters. Provide either configId or (username + filename)",
        400,
      );
    }

    if (!map) {
      return error("Map not found", 404);
    }

    // Variants don't carry their own gift token — inherit it from the
    // parent submission so it's ready by the time the submitter checks out.
    let giftAccessToken = map.giftAccessToken;
    if (!giftAccessToken && map.parentId) {
      const parent = await prisma.mapConfig.findUnique({
        where: { id: map.parentId },
        select: { giftAccessToken: true },
      });
      giftAccessToken = parent?.giftAccessToken ?? null;
    }
    // if (giftAccessToken) {
    //   const donationAllocation = await prisma.donationAllocation.findUnique({
    //     where: { accessToken: giftAccessToken },
    //   });
    //   console.log({ donationAllocation });
    //   map.donationAllocation = donationAllocation;
    //   donationAllocation?.amountCents;
    // }
    // console.log({ giftAccessToken });

    // Check if the user can edit this map
    // User can edit if they are:
    // 1. The owner (userId matches map.userId)
    // 2. A collaborator (userId is in map.collaborators array)
    // 3. the user is admin
    const isOwner = authUserId && authUserId === map.userId;
    const isCollaborator = authUserId && map.collaborators.includes(authUserId);
    const canEdit = isOwner || isCollaborator || isAdmin;

    const keepLists = ["lake", "mountain", "river", "trail"].reduce(
      (acc, type) => {
        acc[`${type}.keepList`] = (map.features || [])
          .filter((f: any) => f.type === type && f.selected)
          .map((f: any) => f.name);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const annotations = map.annotations ?? [];
    const baseFormJson = (map.formJson as any) || buildLegacyFormJson(map);
    const formJson = {
      ...baseFormJson,
      ...keepLists,
      annotations: baseFormJson.annotations ?? annotations,
    };

    return success({
      ...map,
      formJson,
      giftAccessToken,
      canEdit,
    });
  } catch (err: any) {
    return error(err.message || "Server error", 500);
  }
};
