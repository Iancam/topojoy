import { z } from "zod";
import prisma from "../lib/prisma";
import { getAWSKey, putAWSImage } from "../lib/aws";
import { S3Client } from "@aws-sdk/client-s3";
import { filenameSchema, slugify } from "../lib/validation";
import { success, error } from "../lib";

const s3 = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

export const handler = async (event: any) => {
  // respond to post request
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  // get event body
  const body = JSON.parse(event.body);

  const featuresSchema = z.object({
    name: z.string(),
    selected: z.boolean(),
    type: z.enum(["mountain", "river", "trail", "lake"]),
  });

  const annotationSchema = z.object({
    id: z.string().optional(),
    text: z.string(),
    fontSize: z.number(),
    color: z.string(),
    xRatio: z.number(),
    yRatio: z.number(),
  });

  // validate body
  const configSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    title: z.string(),
    config: z.string(),
    filename: filenameSchema.optional(),
    zoomLevel: z.number(),
    curveDensity: z.number(),
    features: z.array(featuresSchema),
    bbox: z.any(),
    selectedTrails: z.any(),
    backgroundText: z.string(),
    backgroundTextElevationRange0: z.number(),
    backgroundTextElevationRange1: z.number(),
    backgroundTextHighContrast: z.boolean(),
    crossHatch: z.boolean(),
    s3Key: z.string().optional(),
    imageUrl: z.string().optional(),
    // num array converted to csv string
    colorPlan: z.string(),
    annotations: z.array(annotationSchema).optional().default([]),
  });

  try {
    const validatedBody = configSchema.parse(body);
    const { annotations, ...mapConfigData } = validatedBody;

    // Slugify filename to ensure URL-friendly format
    if (mapConfigData.filename) {
      mapConfigData.filename = slugify(mapConfigData.filename);
    }

    // Convert userId from Clerk ID to internal database ID
    const user = await prisma.user.findUnique({
      where: { clerkId: mapConfigData.userId },
      select: { id: true },
    });

    if (!user) {
      return error("User not found", 404);
    }

    // Replace Clerk ID with internal database ID
    mapConfigData.userId = user.id;

    const uuid = mapConfigData.id || crypto.randomUUID();
    const s3Key = getAWSKey(uuid);

    const [url, config] = await Promise.all([
      putAWSImage(uuid, s3),
      prisma.$transaction(async (tx) => {
        // If updating an existing map, check permissions
        if (mapConfigData.id) {
          const existingMap = await tx.mapConfig.findUnique({
            where: { id: mapConfigData.id },
            select: { userId: true, collaborators: true },
          });

          if (existingMap) {
            // Check if user is owner or collaborator
            const isOwner = existingMap.userId === mapConfigData.userId;
            const isCollaborator = existingMap.collaborators.includes(
              mapConfigData.userId,
            );

            if (!isOwner && !isCollaborator) {
              throw new Error(
                "UNAUTHORIZED: You do not have permission to edit this map",
              );
            }
          }
        }

        const cfg = await tx.mapConfig.upsert({
          where: {
            id: uuid,
          },
          update: {
            ...mapConfigData,
            id: undefined,
            features: {},
            bbox: mapConfigData.bbox,
            selectedTrails: mapConfigData.selectedTrails,
          },
          create: {
            ...mapConfigData,
            s3Key,
            id: uuid,
            features: {
              create: [],
            },
            bbox: mapConfigData.bbox,
            selectedTrails: mapConfigData.selectedTrails,
          },
        });
        await Promise.all([
          tx.feature.deleteMany({ where: { mapConfigId: cfg.id } }),
          tx.annotation.deleteMany({ where: { mapConfigId: cfg.id } }),
        ]);
        await Promise.all([
          tx.feature.createMany({
            data: validatedBody.features.map((feature) => ({
              ...feature,
              mapConfigId: cfg.id,
            })),
          }),
          tx.annotation.createMany({
            data: validatedBody.annotations.map((ann) => ({
              text: ann.text,
              fontSize: ann.fontSize,
              color: ann.color,
              xRatio: ann.xRatio,
              yRatio: ann.yRatio,
              mapConfigId: cfg.id,
            })),
          }),
        ]);
        return cfg;
      }),
    ]);

    return success({ ...config, AWSPutURL: url });
  } catch (err: any) {
    // Check for unauthorized access
    if (err.message?.includes("UNAUTHORIZED")) {
      return error(
        "You do not have permission to edit this map. Only the owner and collaborators can make changes.",
        403,
      );
    }

    // Check for unique constraint violation on filename
    if (err.code === "P2002" && err.meta?.target?.includes("filename")) {
      return error(
        "A map with this filename already exists. Please choose a different filename.",
        409,
      );
    }

    return error(err.message || "Failed to save map", 400);
  }
};
