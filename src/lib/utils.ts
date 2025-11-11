import { MapConfig } from "@/configs/schema";
import { getUserSelectedTrailsLatLng } from "@/map/trails";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { saveMapConfig as saveMapConfigApi } from "../api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// use when you want to delete old values from the heights, IE, when you're
//changing configs.

export const addHeightsToForm = (config: MapConfig, form: {}) => {
  const heights = config.colorPlan.reduce((obj, { height }, i) => {
    const key = `colorPlan.${i}.height`;
    obj[key] = height;
    return obj;
  }, {});
  Object.keys(form)
    .filter((k) => k.startsWith("colorPlan"))
    .forEach((k) => {
      delete form[k];
    });
  return { ...form, ...heights };
};
/**
 * convert flat keys to nested config keys
 * flat keys look like
 * { backgroundText.text, backgroundText.highContrast }
 */
export const convertToNestedObject = (
  flat: { [key: string]: any },
  defaultObject?: { [key: string]: any }
) => {
  defaultObject = defaultObject || {};
  let config = { ...defaultObject };
  for (const [key, value] of Object.entries(flat)) {
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let current = config;
    for (const k of keys) {
      // allow configFormData to create new fields without having to edit
      // config Files
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }
    current[lastKey] = value;
  }
  return config;
};

export const normalizeFeatureName = (name: string) => {
  return name.replace(/\n/g, " ").trim();
};

export const saveMapConfig = (
  form: any,
  lakes: string[],
  mountains: string[],
  waterFeatures: string[],
  trails: string[],
  bbox: any,
  user: any,
  config: string,
  defaultConfig: MapConfig
) => {
  const nestedForm = convertToNestedObject(form, defaultConfig);
  const featuresData = {
    lake: [form["lake.keepList"], lakes],
    mountain: [form["mountain.keepList"], mountains],
    river: [form["river.keepList"], waterFeatures],
    trail: [form["trail.keepList"], trails],
  };

  // create a list of all features, with their selected state, name, and type
  const features = Object.entries(featuresData).flatMap(
    ([key, [keepList, list]]) => {
      return list.map((name: string) => ({
        selected: keepList.includes(name),
        name,
        type: key,
      }));
    }
  );

  saveMapConfigApi({
    userId: user?.id!,
    title: nestedForm.title.text,
    config,
    zoomLevel: nestedForm.zoomLevel,
    curveDensity: nestedForm.curve.density,

    bbox: bbox,
    selectedTrails: getUserSelectedTrailsLatLng(),
    features,
    backgroundText: nestedForm.backgroundText.text,
    backgroundTextElevationRange0: nestedForm.backgroundText.elevationRange[0],
    backgroundTextElevationRange1: nestedForm.backgroundText.elevationRange[1],
    backgroundTextHighContrast: nestedForm.backgroundText.highContrast,
    crossHatch: nestedForm.crossHatch,
    colorPlan: nestedForm.colorPlan
      .map((c: { height: number }) => c.height)
      .join(","),
  });
};

export const LS = {
  GEOJSON_BBOX: "topojoy:geojson.bbox",
  GEOJSON_SELECTED_TRAIL_SEGMENTS: "topojoy:geojson.selectedtrailSegments",
  GEOJSON_DRAWN_TRAILS: "topojoy:geojson.drawnTrails",
  CONFIG: "topojoy:config",
  IS_DEFAULT_KEEP_LIST_SET: "topojoy:isDefaultKeepListSet",
  FORM: "topojoy:form",
} as const;
