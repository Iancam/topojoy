import { z } from "zod";

// Base schemas for common properties
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const RangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((data) => data.min < data.max, {
    message: "Min must be less than max",
  });

// Feature-specific schemas
const CurveConfigSchema = z.object({
  stepCount: z.number().positive(),
  stepLength: z.number().positive(),
  density: z.number().min(0).max(1),
});

const TrailConfigSchema = z.object({
  colorRange: z.array(ColorSchema).min(2),
  textColor: ColorSchema,
  selectedTrailColor: ColorSchema,
  textSize: z.number().positive(),
  stepLength: z.number().positive(),
  stepCount: z.number().positive(),
  weight: z.number().positive(),
  show: z.boolean(),
});

const RiverConfigSchema = z.object({
  colorRange: z.array(ColorSchema).min(2),
  stepLength: z.number().positive(),
  stepCount: z.number().positive(),
  weight: z.number().positive(),
  streams: z.boolean(),
  textColor: ColorSchema,
  textSize: z.number().positive(),
  show: z.boolean(),
});

const MountainConfigSchema = z.object({
  labelSize: z.number().positive(),
  labelColor: ColorSchema,
  iconSize: z.number().positive(),
  iconColor: ColorSchema,
  keepList: z.array(z.string()),
  drop: z.boolean(),
  show: z.boolean(),
});

const LakeConfigSchema = z.object({
  show: z.boolean(),
  textColor: ColorSchema,
  textSize: z.number().positive(),
  lakeColor: ColorSchema,
  keepList: z.array(z.string()),
  drop: z.boolean(),
});

const BackgroundTextGroupSchema = z.object({
  text: z.string(),
  elevationRange: z.array(z.number().min(0).max(1)).min(2).max(2),
  bbox: z.array(z.number().min(0)).min(4).max(4),
  textSize: z.number().positive().optional(),
});

const BackgroundTextConfigSchema = z.object({
  font: z.string(),
  textSize: z.number().positive(),
  alpha: z.number().positive(),
  highContrast: z.boolean(),
  contrast: z.number().min(0).max(10).optional(),
  groups: z.array(BackgroundTextGroupSchema),
});

// Complete map configuration schema
export const MapConfigSchema = z.object({
  name: z.string(),
  zoomLevel: z.number().positive(),
  title: z.object({
    text: z.string(),
  }),
  curve: CurveConfigSchema,
  trail: TrailConfigSchema,
  mountain: MountainConfigSchema,
  river: RiverConfigSchema,
  lake: LakeConfigSchema,
  backgroundText: BackgroundTextConfigSchema,
  colorPlan: z.array(
    z.object({
      height: z.number(),
      colors: z.union([
        ColorSchema,
        z.array(ColorSchema),
        z.function().returns(ColorSchema),
      ]),
      weight: z.number().optional(),
      spread: z.number().optional(),
    }),
  ),
  background: ColorSchema,
  crossHatch: z.boolean(),
  // Add other feature schemas as needed
});

export type MapConfig = z.infer<typeof MapConfigSchema>;
