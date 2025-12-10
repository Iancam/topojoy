import type { MapConfig } from "./schema";

// DeepPartial utility for nested optional overrides
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Fields that each concrete config MUST provide (can't be sensibly defaulted)
// - name: display/identifier
// - background, colorPlan: artistic scheme is per-config
// - trail.colorRange, river.colorRange: depend on per-config palette
export type RequiredOverride = {
  name: string;
  background: MapConfig["background"];
  colorPlan: MapConfig["colorPlan"];
  trail: { colorRange: MapConfig["trail"]["colorRange"] };
  river: { colorRange: MapConfig["river"]["colorRange"] };
};

// Combined override type: most keys optional, but the above subset required
export type MapConfigOverride = DeepPartial<MapConfig> & RequiredOverride;

// Shared defaults across maps. Purposely omit the required fields listed above.
const baseDefaults: Omit<MapConfig, "name" | "background" | "colorPlan"> = {
  zoomLevel: 13,
  curve: { stepCount: 20, stepLength: 5, density: 5 },
  trail: {
    // colorRange intentionally omitted (must be provided in override)
    textColor: "#ed9228", // orange
    textSize: 2 * 8.001,
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    show: true,
  },
  river: {
    // colorRange intentionally omitted (must be provided in override)
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    streams: false,
    textColor: "#04D9FF", // light blue
    textSize: 2 * 8.001,
    show: true,
  },
  mountain: {
    labelSize: 2 * 8.001,
    labelColor: "#FCD94E", // yellow
    iconSize: 4 * 8.001,
    iconColor: "#000000",
    keepList: [],
    drop: true,
    show: true,
  },
  lake: {
    show: true,
    textColor: "#04D9FF", // light blue
    textSize: 2 * 8.001,
    lakeColor: "#004E63", // blue
    keepList: [],
    drop: true,
  },
  backgroundText: {
    font: "Courier",
    textSize: 1.8 * 8.001,
    bbox: [0, 0, 0, 0],
    alpha: 200,
    text: "",
    elevationRange: [0.7, 1],
  },
  crossHatch: false,
};

// Simple deep merge for plain objects. Arrays and primitives are replaced.
function deepMerge<T>(target: T, ...sources: any[]): T {
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      const key = k as keyof T;
      const current: any = (target as any)[key];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        (target as any)[key] = deepMerge(current ?? {}, v);
      } else {
        (target as any)[key] = v as any;
      }
    }
  }
  return target;
}

// Build a full MapConfig from defaults + overrides with required pieces supplied.
export function createConfig(override: MapConfigOverride): MapConfig {
  const merged = deepMerge({} as any, baseDefaults, override);
  return merged as MapConfig;
}
