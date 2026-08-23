import { z } from "zod";
import prisma from "../lib/prisma";
import { getAWSKey, putAWSImage } from "../lib/aws";
import { S3Client } from "@aws-sdk/client-s3";
import { slugify } from "../lib/validation";
import { success, error, auth } from "../lib";
import { createClerkClient } from "@clerk/backend";

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
  const reflectionSchema = z.object({
    question: z.string().optional(),
    answer: z.string().optional(),
  });

  const configSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    config: z.string(),
    formJson: z.record(z.any()),
    features: z.array(featuresSchema).default([]),
    annotations: z.array(annotationSchema).default([]),
    bbox: z.any(),
    selectedTrails: z.any(),
    reflections: z.array(reflectionSchema).default([]),
    parentId: z.string().optional(),
    status: z.string().optional(),
    imageUrl: z.string().optional(),
    s3Key: z.string().optional(),
  });

  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  });

  const { userId, clerkUserId } = await auth(event, clerkClient);

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const isAdmin = (clerkUser.publicMetadata as any)?.role === "admin";

  try {
    const validatedBody = configSchema.parse(body);
    const {
      id: bodyId,
      userId,
      config,
      formJson,
      features,
      annotations,
      reflections,
      bbox,
      selectedTrails,
      imageUrl,
      s3Key,
      parentId,
      status,
    } = validatedBody;

    // Convert userId from Clerk ID to internal database ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return error("User not found", 404);
    }

    const mapUserId = user.id;

    const uuid = bodyId || crypto.randomUUID();

    const title = (formJson["title.text"] as string) || "";
    let filename = (formJson["filename"] as string)?.trim() || undefined;
    if (filename) {
      filename = slugify(filename);
    }
    const zoomLevel = (formJson["zoomLevel"] as number) || 13;
    const curveDensity = (formJson["curve.density"] as number) || 3;

    const [url, configRecord] = await Promise.all([
      putAWSImage(uuid, s3),
      prisma.$transaction(async (tx) => {
        // If updating an existing map, check permissions
        if (bodyId) {
          const existingMap = await tx.mapConfig.findUnique({
            where: { id: bodyId },
            select: { userId: true, collaborators: true },
          });

          if (existingMap) {
            // Check if user is owner or collaborator
            const isOwner = existingMap.userId === mapUserId;
            const isCollaborator =
              existingMap.collaborators.includes(mapUserId);

            if (!isOwner && !isCollaborator && !isAdmin) {
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
            userId: mapUserId,
            formJson: formJson as any,
            title,
            filename,
            zoomLevel,
            curveDensity,
            config,
            bbox,
            selectedTrails,
            imageUrl,
            ...(parentId !== undefined && { parentId }),
            ...(status !== undefined && { status }),
            ...(s3Key && { s3Key }),
          },
          create: {
            id: uuid,
            userId: mapUserId,
            formJson: formJson as any,
            title,
            filename,
            zoomLevel,
            curveDensity,
            config,
            bbox,
            selectedTrails,
            imageUrl,
            s3Key: getAWSKey(uuid),
            ...(parentId !== undefined && { parentId }),
            ...(status !== undefined && { status }),
          },
        });
        await Promise.all([
          tx.feature.deleteMany({ where: { mapConfigId: cfg.id } }),
          tx.annotation.deleteMany({ where: { mapConfigId: cfg.id } }),
          ...(reflections.length > 0
            ? [tx.reflection.deleteMany({ where: { mapConfigId: cfg.id } })]
            : []),
        ]);
        await Promise.all([
          tx.feature.createMany({
            data: features.map((feature) => ({
              ...feature,
              mapConfigId: cfg.id,
            })),
          }),
          tx.annotation.createMany({
            data: annotations.map((ann) => ({
              text: ann.text,
              fontSize: ann.fontSize,
              color: ann.color,
              xRatio: ann.xRatio,
              yRatio: ann.yRatio,
              mapConfigId: cfg.id,
            })),
          }),
          ...(reflections.length > 0
            ? [
                tx.reflection.createMany({
                  data: reflections.map((r) => ({
                    question: r.question,
                    answer: r.answer,
                    mapConfigId: cfg.id,
                  })),
                }),
              ]
            : []),
        ]);
        return cfg;
      }),
    ]);

    return success({ ...configRecord, AWSPutURL: url });
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
