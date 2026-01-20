import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

export const handler = async (event: any) => {
  // respond to post request
  if (event.httpMethod === "POST") {
    // get event body
    const body = JSON.parse(event.body);

    const featuresSchema = z.object({
      name: z.string(),
      selected: z.boolean(),
      type: z.enum(["mountain", "river", "trail", "lake"]),
    });

    // validate body
    const configSchema = z.object({
      id: z.string().optional(),
      userId: z.string(),
      title: z.string(),
      config: z.string(),
      filename: z.string().optional(),
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
      // num array converted to csv string
      colorPlan: z.string(),
    });

    try {
      const validatedBody = configSchema.parse(body);
      // convert colorPlan to csv string
      // save to db
      const config = await prisma.$transaction(async (tx) => {
        const cfg = await tx.mapConfig.upsert({
          where: {
            filename_userId: {
              filename: validatedBody.filename || "",
              userId: validatedBody.userId,
            },
          },
          update: {
            ...validatedBody,
            id: undefined,
            features: {},
            bbox: validatedBody.bbox,
            selectedTrails: validatedBody.selectedTrails,
          },
          create: {
            ...validatedBody,
            id: undefined,
            features: {
              create: [],
            },
            bbox: validatedBody.bbox,
            selectedTrails: validatedBody.selectedTrails,
          },
        });
        await tx.feature.deleteMany({
          where: {
            mapConfigId: cfg.id,
          },
        });
        await tx.feature.createMany({
          data: validatedBody.features.map((feature) => ({
            ...feature,
            mapConfigId: cfg.id,
          })),
        });
        return cfg;
      });

      return {
        statusCode: 200,
        body: JSON.stringify(config),
      };
    } catch (error) {
      console.log(error);
      return {
        statusCode: 400,
        body: JSON.stringify(error),
      };
    }
  }
};
