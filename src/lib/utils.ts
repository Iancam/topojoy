import { MapConfig } from "@/configs/schema";
import { getUserSelectedTrailsLatLng } from "@/map/trails";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { maps } from "../api";
import { Configs } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fitToParent = (
  img: HTMLImageElement,
  dimensions: { width: number; height: number },
  sketchDims: { width: number; height: number }
) => {
  const pw = dimensions.width;
  const ph = dimensions.height;

  console.log(dimensions);
  const { width, height } = sketchDims; // original sketch size
  if (!width || !height) return;

  const scale = Math.min(pw / width, ph / height);

  img.style.width = ``;
  img.style.height = `${ph}px`;
  img.style.maxWidth = `fit-content`;
  img.style.maxHeight = `100%`;

  // img.style.position = "absolute";
  // img.style.left = "50%";
  // img.style.top = "50%";
  // img.style.transform = "translate(-50%, -50%)";
  // img.style.zIndex = "-1";
};

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
const deepClone = (obj: any) => {
  try {
    // @ts-ignore
    if (typeof structuredClone === "function") return structuredClone(obj);
  } catch {}
  return JSON.parse(JSON.stringify(obj));
};

export const convertToNestedObject = (
  flat: { [key: string]: any },
  defaultObject?: { [key: string]: any }
) => {
  const base = defaultObject || {};
  let config = deepClone(base);
  for (const [key, value] of Object.entries(flat)) {
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let current = config as any;
    for (const k of keys) {
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }
    current[lastKey] = deepClone(value);
  }
  return config;
};

export const normalizeFeatureName = (name: string) => {
  return name.replace(/\n/g, " ").trim();
};

export const LS = {
  GEOJSON_BBOX: "topojoy:geojson.bbox",
  GEOJSON_SELECTED_TRAIL_SEGMENTS: "topojoy:geojson.selectedtrailSegments",
  GEOJSON_DRAWN_TRAILS: "topojoy:geojson.drawnTrails",
  CONFIG: "topojoy:config",
  IS_DEFAULT_KEEP_LIST_SET: "topojoy:isDefaultKeepListSet",
  FORM: "topojoy:form",
  COLLISIONS: "topojoy:collisions",
} as const;

export const getFormFromLocalStorage = (
  preForm: any,
  config: string,
  configs: Configs
) => {
  const saved = JSON.parse(localStorage.getItem(LS.FORM) || "{}") || {};
  Object.keys(saved).forEach((k) => {
    k.startsWith("colorPlan") &&
      k.endsWith("height") &&
      saved[k] === null &&
      (saved[k] = Infinity);
  });
  const base = addHeightsToForm(configs[config], preForm);
  return { ...base, ...saved };
};
