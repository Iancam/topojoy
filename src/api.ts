import { MapConfig } from "./configs/schema";

export const maps = {
  upsert: async (config: {
    userId: string;
    id?: string;
    filename?: string;
    title: string;
    config: string;
    zoomLevel: number;
    curveDensity: number;

    features: { selected: boolean; name: string; type: string }[];

    bbox: any;
    selectedTrails: any;

    backgroundText: string;
    backgroundTextElevationRange0: number;
    backgroundTextElevationRange1: number;
    backgroundTextHighContrast: boolean;

    crossHatch: boolean;
    colorPlan: string;
  }) => {
    // save to api
    const response = await fetch("/.netlify/functions/map-upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error("Failed to save config");
    }
  },
  all: async function getMaps(userId: string): Promise<MapListItem[]> {
    const res = await fetch(
      `/.netlify/functions/map-all?userId=${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error(`Failed to load maps (${res.status})`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to load maps");
    return json.data as MapListItem[];
  },
  get: async function (
    userId: string,
    configId: string
  ): Promise<{
    config: string;
    zoomLevel: number;
    features: { selected: boolean; name: string; type: string }[];
    bbox: any;
    selectedTrails: any;
    "backgroundText.text": string;
    "curve.density": number;
    "title.text": string;
    "river.keepList": string[];
    "backgroundText.elevationRange": number[];
    "backgroundText.highContrast": boolean;
    crossHatch: boolean;
    colorPlan: string;
  }> {
    const res = await fetch(
      `/.netlify/functions/map-get?userId=${encodeURIComponent(userId)}&configId=${encodeURIComponent(configId)}`
    );
    if (!res.ok) throw new Error(`Failed to load map config (${res.status})`);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.message || "Failed to load map config");
    // deserialize the config
    /**
     * example response:
     * {
     *  backgroundText: ""
     *  backgroundTextElevationRange0: 0.7
     *  backgroundTextElevationRange1: 1
     *  backgroundTextHighContrast: false
     *  bbox: {id: 'GWD15qfdspdk4IONJu0iRBdTKw5dFjoe', type: 'Feature', geometry: {…}, properties: {…}}
     *  colorPlan: "-0.10000000000000009,0.02,0.25,0.51,0.7,0.7,0.9,0.9,Infinity"
     *  config: "Original"
     *  createdAt: "2025-10-27T23:49:46.544Z"
     *  crossHatch: false
     *  curveDensity: 5
     *  id: "cmh9si9ey0005oqwqauvjq5v1"
     *  selectedTrails: (4) [{…}, {…}, {…}, {…}]
     *  title: "Bullet Canyon"
     *  updatedAt: "2025-10-27T23:49:46.544Z"
     *  userId: "user_34CPLIBJquDn75RFvaDj4c7zMbe"
     *  zoomLevel: 15
     * }
     */

    const data = json.data;
    const ret = {
      ...data.colorPlan
        .split(",")
        .map((c: string, i: number) => ({
          key: `colorPlan.${i}.height`,
          value: Number(c),
        }))
        .reduce(
          (
            obj: { [key: string]: number },
            { key, value }: { key: string; value: number }
          ) => {
            obj[key] = value;
            return obj;
          },
          {}
        ),
      "backgroundText.text": data.backgroundText,
      "backgroundText.elevationRange": [
        data.backgroundTextElevationRange0 as number,
        data.backgroundTextElevationRange1 as number,
      ],
      "backgroundText.highContrast": data.backgroundTextHighContrast as boolean,
      crossHatch: data.crossHatch as boolean,
      "curve.density": data.curveDensity as number,
      "title.text": data.title as string,
      "river.keepList": data.features
        .filter((t: any) => t.type === "river" && t.selected)
        .map((t: any) => t.name as string),
      "trail.keepList": data.features
        .filter((t: any) => t.type === "trail" && t.selected)
        .map((t: any) => t.name as string),
      "mountain.keepList": data.features
        .filter((t: any) => t.type === "mountain" && t.selected)
        .map((t: any) => t.name as string),
      "lake.keepList": data.features
        .filter((t: any) => t.type === "lake" && t.selected)
        .map((t: any) => t.name as string),
      zoomLevel: data.zoomLevel as number,
      bbox: data.bbox,
      selectedTrails: data.selectedTrails,
      features: data.features,
      config: data.config,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      userId: data.userId,
      id: data.id,
    };

    return ret;
  },
};

export type MapListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
};
