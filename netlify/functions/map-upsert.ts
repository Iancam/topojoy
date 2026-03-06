import { z } from "zod";
import prisma from "../lib/prisma";

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
      s3Key: z.string().optional(),
      imageUrl: z.string().optional(),
      // num array converted to csv string
      colorPlan: z.string(),
      annotations: z.array(annotationSchema).optional().default([]),
    });

    try {
      const validatedBody = configSchema.parse(body);
      const { annotations, ...mapConfigData } = validatedBody;
      // convert colorPlan to csv string
      // save to db
      const config = await prisma.$transaction(async (tx) => {
        const cfg = await tx.mapConfig.upsert({
          where: {
            filename_userId: {
              filename: mapConfigData.filename || "",
              userId: mapConfigData.userId,
            },
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
            id: undefined,
            features: {
              create: [],
            },
            bbox: mapConfigData.bbox,
            selectedTrails: mapConfigData.selectedTrails,
          },
        });
        await tx.feature.deleteMany({
          where: { mapConfigId: cfg.id },
        });
        await tx.feature.createMany({
          data: validatedBody.features.map((feature) => ({
            ...feature,
            mapConfigId: cfg.id,
          })),
        });
        await tx.annotation.deleteMany({
          where: { mapConfigId: cfg.id },
        });
        await tx.annotation.createMany({
          data: validatedBody.annotations.map((ann) => ({
            text: ann.text,
            fontSize: ann.fontSize,
            color: ann.color,
            xRatio: ann.xRatio,
            yRatio: ann.yRatio,
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
