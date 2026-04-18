import { z } from "zod";
import prisma from "../lib/prisma";
import { getAWSKey, putAWSImage } from "../lib/aws";
import { S3Client } from "@aws-sdk/client-s3";
import { filenameSchema, slugify } from "../lib/validation";

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
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ ...config, AWSPutURL: url }),
    };
  } catch (error: any) {
    console.error("Map upsert error:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Check for unauthorized access
    if (error.message?.includes("UNAUTHORIZED")) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "UNAUTHORIZED",
          message:
            "You do not have permission to edit this map. Only the owner and collaborators can make changes.",
        }),
      };
    }

    // Check for unique constraint violation on filename
    if (error.code === "P2002" && error.meta?.target?.includes("filename")) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "FILENAME_CONFLICT",
          message:
            "A map with this filename already exists. Please choose a different filename.",
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message || "Failed to save map",
      }),
    };
  }
};
