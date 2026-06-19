import { maps } from "@/api";
import { formElements } from "@/components/configFormData";
import {
  convertToNestedObject,
  getFormFromLocalStorage,
  LS,
  normalizeFeatureName,
} from "@/lib/utils";
import { tilesForFeatures } from "@/map/processImage";
import { getFeatures, getGeoJSONFromOSM } from "@/map/trails";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { ToastState } from "./useToast";
import { configs } from "@/mapConfigs";
import { RenderSketchParams } from "./useRenderSketch";

export function useLoadMap({
  user,
  setIsRendering,
  setToast,
  renderSketch,
}: {
  user?: any;
  setIsRendering: (value: boolean) => void;
  setToast: (toast: ToastState) => void;
  renderSketch: (params: RenderSketchParams) => () => void;
}) {
  const [canEdit, setCanEdit] = useState(true);
  const [mapNotFoundError, setMapNotFoundError] = useState<string | null>(null);
  const [bbox, setBbox] = useState<any>(null);
  const [selectedTrails, setSelectedTrails] = useState<string[]>([]);
  const [features, setFeatures] = useState<{ [key: string]: string[] }>({});
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ username?: string; filename?: string }>();
  const configId = searchParams.get("configId");
  const { username, filename } = routeParams;
  const preForm = Object.entries(formElements).reduce(
    (obj, [key, [_, __, value]]) => {
      obj[key] = value;
      return obj;
    },
    {},
  );
  const [form, setForm] = useState<Record<string, any>>(preForm);
  const [config, setConfig] = useState("Original");

  const [collisions, setCollisions] = useState<Record<string, string[]>>(() => {
    if (configId) {
      return {};
    }
    const saved = localStorage.getItem(LS.COLLISIONS);
    return saved ? JSON.parse(saved) : {};
  });

  function mapFromLocalStorage() {
    console.log("loading data from localStorage");
    const bbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
    const selectedTrails = JSON.parse(
      localStorage.getItem(LS.GEOJSON_SELECTED_TRAIL_SEGMENTS) || "[]",
    );
    const configName = localStorage.getItem(LS.CONFIG) || "Original";
    const form = getFormFromLocalStorage(preForm, configName, configs);
    const downstreamConfig = convertToNestedObject(form, configs[configName]);
    setBbox(bbox);
    setSelectedTrails(selectedTrails);
    setConfig(configName);
    setForm(form);
    if (!bbox) {
      setToast({
        message: "No bounding box found in localStorage",
        type: "error",
      });
      return;
    }
    const { bounds } = tilesForFeatures(bbox, downstreamConfig.zoomLevel);

    // Show loading state while fetching trail data
    setIsRendering(true);

    getGeoJSONFromOSM(bounds.latLngBox)
      .then((geoJSON) => {
        const rawFeats = getFeatures(
          { box: bounds.box, zoom: downstreamConfig.zoomLevel },
          geoJSON,
        );
        const feats = Object.entries(rawFeats).reduce(
          (acc, [key, value]) => {
            // key minus trailing s
            const type = key.slice(0, -1);
            acc[type] = Object.keys(value).map(normalizeFeatureName);
            return acc;
          },
          {} as Record<string, string[]>,
        );
        setFeatures(feats);
        renderSketch({
          config: configName,
          form,
          setForm,
          bbox,
          selectedTrails,
          features: feats,
          setFeatures,
          setCollisions,
        })();
      })
      .catch((err) => {
        console.error("Failed to load trail data:", err);

        // Stop showing loader when API fails
        setIsRendering(false);

        setToast({
          message:
            err.message || "Failed to load trail data. Please try again later.",
          type: "error",
        });
      });
  }

  function mapFromAPI() {
    // get config from db - support both lookup methods
    const queryParams = configId
      ? { userId: user?.id!, configId }
      : { userId: user?.id!, username, filename };

    maps
      .get(queryParams)
      .then((config: any) => {
        console.log("retrieved config from database");
        // Clear any previous error
        setMapNotFoundError(null);

        // Set edit permissions based on API response
        setCanEdit(config.canEdit ?? true);

        // Show notification if user cannot edit
        if (config.canEdit === false) {
          setToast({
            message:
              "You are viewing this map in read-only mode. Only the owner can make changes.",
            type: "info",
          });
        }

        setConfig(config.config);
        setForm({ ...preForm, ...config });
        setSelectedTrails(config.selectedTrails);
        setBbox(config.bbox);
        // set fealures
        const feats = config.features.reduce(
          (
            acc: Record<string, string[]>,
            feat: { type: string; name: string },
          ) => {
            if (!acc[feat.type]) {
              acc[feat.type] = [];
            }
            acc[feat.type].push(normalizeFeatureName(feat.name));
            return acc;
          },
          {} as Record<string, string[]>,
        );
        setFeatures(feats);
        renderSketch({
          config: config.config,
          form: { ...preForm, ...config },
          bbox: config.bbox,
          selectedTrails: config.selectedTrails,
          features: feats,
          setForm,
          setFeatures,
          setCollisions,
        })();
      })
      .catch((error: Error) => {
        console.error("Failed to load map:", error);

        // Set persistent error message
        const errorMessage =
          username && filename
            ? `Map not found: /${username}/${filename}`
            : `Map not found (ID: ${configId})`;

        setMapNotFoundError(errorMessage);
        setIsRendering(false);
      });
  }

  useEffect(() => {
    if (configId || (username && filename)) {
      mapFromAPI();
    } else {
      mapFromLocalStorage();
    }
  }, []);

  return {
    canEdit,
    mapNotFoundError,
    bbox,
    selectedTrails,
    features,
    setFeatures,
    configId,
    form,
    setForm,
    config,
    setConfig,
    collisions,
    setCollisions,
  };
}
