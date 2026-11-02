import { getImageUrlFromAws, maps } from "@/api";
import { formElements } from "@/components/configFormData";
import {
  convertToNestedObject,
  getFormFromLocalStorage,
  LS,
  normalizeFeatureName,
} from "@/lib/utils";
import { GIFT_TOKEN_KEY } from "@/lib/giftToken";
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
  loadSavedImage,
}: {
  user?: any;
  setIsRendering: (value: boolean) => void;
  setToast: (toast: ToastState) => void;
  renderSketch: (params: RenderSketchParams) => () => void;
  loadSavedImage: (params: {
    imageUrl: string;
    setForm: (form: any) => void;
  }) => () => void;
}) {
  const [mapNotFoundError, setMapNotFoundError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
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

  const isAdmin = (user?.publicMetadata as any)?.role === "admin";

  function mapFromLocalStorage() {
    const defaultName = Object.keys(configs)[0];
    const configName = localStorage.getItem(LS.CONFIG) || defaultName;
    const form = getFormFromLocalStorage(preForm, configName, configs);

    setConfig(configName);
    setForm(form);
    loadLocationFromLocalStorage(config, form);
  }

  function mapFromAPI() {
    // get config from db - support both lookup methods
    const queryParams = configId
      ? { userId: user?.id!, configId }
      : { userId: user?.id!, username, filename };

    maps
      .get(queryParams)
      .then(async (config: any) => {
        console.log("retrieved config from database");
        // Clear any previous error
        setMapNotFoundError(null);
        setConfig(config.config);
        const mergedForm = { ...preForm, ...config };
        // Backfill legacy maps that only have a single text value.
        if (
          config["backgroundText.text"] &&
          !mergedForm["backgroundText.groups"]
        ) {
          mergedForm["backgroundText.groups"] = [
            {
              text: config["backgroundText.text"] || "",
              elevationRange: config["backgroundText.elevationRange"] || [
                0.7, 1,
              ],
              bbox: [0, 0, 0, 0],
            },
          ];
        }
        setForm(mergedForm);
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

        const localCanEdit = config.canEdit ?? isAdmin;
        setCanEdit(localCanEdit);
        console.log({ localCanEdit });
        if (!localCanEdit) {
          setToast({
            message:
              "You are viewing this map in read-only mode. Only the owner can make changes.",
            type: "info",
          });
        }

        if (config.s3Key) {
          try {
            const imageUrl = await getImageUrlFromAws(config.s3Key);
            loadSavedImage({
              imageUrl,
              setForm,
            })();
          } catch (err) {
            console.error(
              "Failed to load saved image from S3, falling back to render",
              err,
            );
            renderSketch({
              config: config.config,
              form: mergedForm,
              bbox: config.bbox,
              selectedTrails: config.selectedTrails,
              features: feats,
              setForm,
              setFeatures,
              setCollisions,
            })();
          }
        } else {
          renderSketch({
            config: config.config,
            form: mergedForm,
            bbox: config.bbox,
            selectedTrails: config.selectedTrails,
            features: feats,
            setForm,
            setFeatures,
            setCollisions,
          })();
        }
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

  // Re-pull bbox/trail selection from the standalone Map Editor (geojson.io),
  // which writes to the same localStorage keys used on initial map creation.
  // Unlike mapFromLocalStorage, this keeps the currently loaded config/form
  // intact and only refreshes location-derived data (bbox, trails, features).
  function loadLocationFromLocalStorage(configName: string, inpForm: any) {
    const bbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
    const selectedTrails = JSON.parse(
      localStorage.getItem(LS.GEOJSON_SELECTED_TRAIL_SEGMENTS) || "[]",
    );

    if (!bbox || Object.keys(bbox).length === 0) {
      setToast({
        message:
          "No bounding box found. Draw one in the Map Editor first, then try again.",
        type: "error",
      });
      return;
    }

    setBbox(bbox);
    setSelectedTrails(selectedTrails);

    const downstreamConfig = convertToNestedObject(
      inpForm ?? form,
      configs[configName ?? config],
    );
    const { bounds } = tilesForFeatures(bbox, downstreamConfig.zoomLevel);

    setIsRendering(true);

    getGeoJSONFromOSM(bounds.latLngBox)
      .then((geoJSON) => {
        const rawFeats = getFeatures(
          { box: bounds.box, zoom: downstreamConfig.zoomLevel },
          geoJSON,
        );
        const feats = Object.entries(rawFeats).reduce(
          (acc, [key, value]) => {
            const type = key.slice(0, -1);
            acc[type] = Object.keys(value).map(normalizeFeatureName);
            return acc;
          },
          {} as Record<string, string[]>,
        );
        setFeatures(feats);
        renderSketch({
          config: configName ?? config,
          form: inpForm ?? form,
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
        setIsRendering(false);
        setToast({
          message:
            err.message || "Failed to load trail data. Please try again later.",
          type: "error",
        });
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
    loadLocationFromLocalStorage,
  };
}
