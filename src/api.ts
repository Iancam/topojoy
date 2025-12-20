import { MapConfig } from "./configs/schema";
import { convertToNestedObject } from "./lib/utils";

/**
 * The app is small, and will likely remain small. A layer between
 * the client and the api would enable things that I wouldn't use,
 * and would cost more to maintain.
 */

export type MapConfigDTO = {
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
};

export const maps = {
  // Will not return a map with features
  upsert: async (
    form: any,
    givenFeatures: Record<string, string[]>,
    bbox: any,
    selectedTrails: any,
    user: any,
    configName: string,
    defaultConfig: MapConfig
  ) => {
    const config = formToDTO(
      form,
      givenFeatures,
      bbox,
      selectedTrails,
      user,
      configName,
      defaultConfig
    );
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
    const json = await response.json();
    console.log({ json });
    const ret = DTOToForm(json);
    // if (!json.success) throw new Error(json.message || "Failed to save config");
    return ret;
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
  get: async function (userId: string, configId: string): Promise<any> {
    const res = await fetch(
      `/.netlify/functions/map-get?userId=${encodeURIComponent(userId)}&configId=${encodeURIComponent(configId)}`
    );
    if (!res.ok) throw new Error(`Failed to load map config (${res.status})`);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.message || "Failed to load map config");

    const data = json.data;
    const ret = DTOToForm(data);

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

const formToDTO = (
  form: any,
  givenFeatures: Record<string, string[]>,
  bbox: any,
  selectedTrails: any,
  user: any,
  configName: string,
  defaultConfig: MapConfig
) => {
  const nestedForm = convertToNestedObject(form, defaultConfig);
  const featuresData = {
    lake: [form["lake.keepList"] || [], givenFeatures.lake || []],
    mountain: [form["mountain.keepList"] || [], givenFeatures.mountain || []],
    river: [form["river.keepList"] || [], givenFeatures.river || []],
    trail: [form["trail.keepList"] || [], givenFeatures.trail || []],
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

  return {
    id: form.id,
    userId: user?.id!,
    title: nestedForm.title.text,
    config: configName,
    zoomLevel: nestedForm.zoomLevel,
    curveDensity: nestedForm.curve.density,
    filename: nestedForm.filename,
    bbox: bbox,
    selectedTrails,
    features,
    backgroundText: nestedForm.backgroundText.text,
    backgroundTextElevationRange0: nestedForm.backgroundText.elevationRange[0],
    backgroundTextElevationRange1: nestedForm.backgroundText.elevationRange[1],
    backgroundTextHighContrast: nestedForm.backgroundText.highContrast,
    crossHatch: nestedForm.crossHatch,
    colorPlan: nestedForm.colorPlan
      .map((c: { height: number }) => c.height)
      .join(","),
  };
};

const DTOToForm = (data: MapConfigDTO) => {
  const keeplists = ["lake", "mountain", "river", "trail"].reduce(
    (acc, type) => {
      const features = data.features || [];
      acc[`${type}.keepList`] = features
        .filter((f) => f.type === type && f.selected)
        .map((f) => f.name);
      return acc;
    },
    {} as { [key: string]: string[] }
  );

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
    ...keeplists,
    // hand translate data fields to avoid polluting the form
    zoomLevel: data.zoomLevel as number,
    bbox: data.bbox,
    selectedTrails: data.selectedTrails,
    features: data.features,
    config: data.config,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    userId: data.userId,
    id: data.id,
    filename: data.filename,
  };

  return ret;
};
