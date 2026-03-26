import { featureFlags } from "../api";

export const FEATURE_FLAGS = {
  mapEditorEnabled: "map_editor_enabled",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

type FeatureFlagsResponse = {
  flags?: Record<string, boolean>;
};

const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAGS.mapEditorEnabled]: true,
};

let cachedFlags: Record<string, boolean> | null = null;

export const getFeatureFlags = async () => {
  if (cachedFlags) return cachedFlags;

  try {
    const data = (await featureFlags.get({})) as FeatureFlagsResponse;
    cachedFlags = {
      ...DEFAULT_FLAGS,
      ...(data.flags || {}),
    };
  } catch {
    cachedFlags = { ...DEFAULT_FLAGS };
  }

  return cachedFlags;
};

export const isFeatureEnabled = async (key: FeatureFlagKey) => {
  const flags = await getFeatureFlags();
  return flags[key] ?? false;
};

export const invalidateFeatureFlagsCache = () => {
  cachedFlags = null;
};
