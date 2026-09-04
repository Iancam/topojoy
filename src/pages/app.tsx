import { useState, useRef, useEffect } from "react";
import p5 from "p5";
import { sketchFactory } from "../map/sketch.js";

import { ConfigForm } from "../components/configForm.tsx";
import { P5Canvas } from "../components/p5Canvas.tsx";

import { maps, order, saveImageToAws } from "../api.ts";
import { fitToParent, LS, needsFilenamePrompt } from "../lib/utils.ts";
import { useUser } from "@clerk/clerk-react";
import { addHeightsToForm } from "../lib/utils.ts";
import _ from "lodash";
import { Header } from "../components/Header.tsx";
import { printTypes } from "../components/PrintOptions.tsx";
import { useCartContext } from "../cartContext.tsx";
import { useLoadMap } from "@/hooks/useMapLoader.ts";
import { useToast } from "@/hooks/useToast.ts";
import { configs } from "@/mapConfigs.ts";
import { Toast } from "@/components/Toast.tsx";
import { useRenderSketch } from "@/hooks/useRenderSketch.ts";
import { useLayerRedraw } from "@/hooks/useLayerRedraw.ts";
import { imageCapture } from "@/lib/imageCapture.ts";
import { useSaveMap } from "@/hooks/useSaveMap.ts";
import { usePersistHook } from "@/hooks/persistHook.ts";

const TEXT_KEYS = [
  "backgroundText.text",
  "backgroundText.elevationRange",
  "backgroundText.highContrast",
  "backgroundText.contrast",
  "textSizeMultiplier",
];

const OVERLAY_KEYS = [
  "mountain.keepList",
  "trail.keepList",
  "river.keepList",
  "lake.keepList",
  "textSizeMultiplier",
  "title.text",
  "mountain.labelColor",
  "mountain.iconColor",
  "river.textColor",
  "river.colorRange",
  "trail.textColor",
  "trail.colorRange",
  "trail.selectedTrailColor",
];

export const App = () => {
  // Always use Clerk's useUser hook so auth works in both development and production.
  const { isSignedIn, user } = useUser();
  const isAdmin = (user?.publicMetadata as any)?.role === "admin";
  // const [variantLabel, setVariantLabel] = useState("");
  const [savingVariant, setSavingVariant] = useState(false);

  const [mapImageIsExpanded, setMapImageIsExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [imageIsStale, setImageIsStale] = useState(false);
  // const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsMode, setAnnotationsMode] = useState(false);

  // Track if the current user can edit this map

  const cartContext = useCartContext();

  const { toast, setToast } = useToast();

  const {
    renderSketch,
    loadSavedImage,
    dimensions,
    sketchDims,
    p5MountRef,
    p5Ref,
    isInitialRun,
    redrawFnsRef,
  } = useRenderSketch({
    setIsRendering,
    onImageReady: () => {
      setImageIsStale(false);
      console.log("Image ready");
    },
  });

  const {
    canEdit: canEditFromAPI,
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
  } = useLoadMap({
    user,
    setIsRendering,
    setToast,
    renderSketch,
    loadSavedImage,
  });

  // Admins can always edit any map; non-admins defer to API ownership check
  const canEdit = isAdmin || canEditFromAPI;
  useLayerRedraw({
    keys: OVERLAY_KEYS,
    form,
    config: config ?? null,
    redrawFnsRef,
    redrawFn: (fns, nestedForm) => fns.redrawOverlayLayer(nestedForm),
    debounceMs: 400,
    setIsRendering,
  });

  useLayerRedraw({
    keys: TEXT_KEYS,
    form,
    config: config ?? null,
    redrawFnsRef,
    redrawFn: (fns, nestedForm) => fns.redrawTextLayer(nestedForm),
    debounceMs: 600,
    setIsRendering,
  });

  useEffect(() => {
    if (isRendering) {
      setMapImageIsExpanded(false);
    } else {
      // Re-apply fit-to-container after render completes so the canvas is
      // correctly sized and the toggle state matches the visual state.
      const canvasEl = p5MountRef.current?.querySelector(
        "canvas",
      ) as HTMLCanvasElement | null;
      if (
        canvasEl &&
        dimensions.width &&
        dimensions.height &&
        sketchDims.width &&
        sketchDims.height
      ) {
        const scale = Math.min(
          dimensions.width / sketchDims.width,
          dimensions.height / sketchDims.height,
        );
        canvasEl.style.maxWidth = `fit-content`;
        canvasEl.style.maxHeight = `100%`;
        canvasEl.style.width = `${sketchDims.width * scale}px`;
        canvasEl.style.height = `${sketchDims.height * scale}px`;
        canvasEl.style.position = "absolute";
        canvasEl.style.top = "0";
        canvasEl.style.left = "0";
      }
    }
  }, [isRendering]);

  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      "cart.orderId": cartContext.cart?.id ?? null,
    }));
  }, [cartContext.cart?.id]);

  const { captureImage, captureImageForPrint, saveImage } = imageCapture({
    form,
    p5MountRef,
  });

  const { handleUpload, handleAddToOrder, isUploading, isPurchasing } =
    useSaveMap({
      form,
      onFormChange,
      captureImage,
      captureImageForPrint,
      setToast,
      features,
      bbox,
      selectedTrails,
      user,
      config,
      isSignedIn,
      cartContext,
    });

  function onFormChange(arg1: any, arg2?: any) {
    // if arg1 is a string, do the normal thing
    if (typeof arg1 === "string") {
      const key = arg1 as string;
      const value = arg2;
      setForm({
        ...form,
        [key]: value,
      });
    } else if (typeof arg1 === "object") {
      setForm({
        ...form,
        ...arg1,
      });
    }
    setImageIsStale(true);
  }
  const onConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(e.target.value);
    setForm(addHeightsToForm(configs[e.target.value], form));
    setImageIsStale(true);
  };

  const toggleMapImageIsExpanded = () => {
    const expanded = !mapImageIsExpanded;
    setMapImageIsExpanded(expanded);
    const mountNode = p5MountRef.current;
    if (!mountNode) return;

    const canvasEl = mountNode.querySelector(
      "canvas",
    ) as HTMLCanvasElement | null;
    const imgEl = mountNode.querySelector("img") as HTMLImageElement | null;
    const target = canvasEl ?? imgEl;
    if (!target) return;

    if (expanded) {
      target.style.width = `${sketchDims.width}px`;
      target.style.height = `${sketchDims.height}px`;
      target.style.maxWidth = `${sketchDims.width}px`;
      target.style.maxHeight = `${sketchDims.height}px`;
      target.style.position = "absolute";
      target.style.top = "0";
      target.style.left = "0";
      target.style.transform = "";
      if (imgEl) imgEl.style.objectFit = "contain";
    } else {
      const pw = dimensions.width;
      const ph = dimensions.height;
      const scale = Math.min(pw / sketchDims.width, ph / sketchDims.height);
      target.style.width = `${sketchDims.width * scale}px`;
      target.style.height = `${sketchDims.height * scale}px`;
      target.style.maxWidth = "";
      target.style.maxHeight = "";
      target.style.position = "absolute";
      target.style.top = "0";
      target.style.left = "0";
      target.style.transform = "";
      if (imgEl) imgEl.style.objectFit = "contain";
    }
  };

  const handleSaveVariant = async () => {
    // if (!configId || !variantLabel.trim()) return;
    if (!configId) return;
    setSavingVariant(true);
    try {
      const variantForm = {
        ...form,
        id: undefined,
        // filename: variantLabel.replace(/\s+/g, "-").toLowerCase(),
      };
      const blob = await captureImage();
      if (!blob) {
        setToast({
          message: "Failed to capture map image. Variant not saved.",
          type: "error",
        });
        return;
      }
      const newMapConfig = await maps.upsert({
        form: variantForm,
        givenFeatures: features,
        bbox,
        selectedTrails,
        user,
        configName: config,
        defaultConfig: configs[config],
        imageUrl: undefined,
        s3Key: undefined,
        parentId: variantForm.parentId ?? configId,
        status: "variant",
        reflections: [],
      });
      await saveImageToAws({
        blob,
        AWSPutURL: newMapConfig.AWSPutURL,
      });
      setToast({
        message: `Variant "${form.filename}" saved`,
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err.message || "Failed to save variant",
        type: "error",
      });
    } finally {
      setSavingVariant(false);
    }
  };

  // Persist current config selection
  usePersistHook({
    configId,
    config,
    form,
    collisions,
    isInitialRun,
  });

  return (
    <div>
      {/* Header */}
      <Header />

      {/* Persistent Error Banner */}
      {mapNotFoundError && (
        <div className="fixed top-15 left-0 right-0 z-40 bg-red-600 text-white px-6 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-lg">Map Not Found</p>
                <p className="text-sm text-red-100">{mapNotFoundError}</p>
                <p className="text-xs text-red-200 mt-1">
                  This map may have been deleted or the URL is incorrect.
                </p>
              </div>
            </div>
            <a
              href="/app"
              className="px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium text-sm"
            >
              Create New Map
            </a>
          </div>
        </div>
      )}
      {toast && <Toast toast={toast} setToast={setToast} />}
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80"></div>
        <div className="w-80 fixed top-15 left-0 h-full overflow-y-auto border-r bg-white p-4 pb-24 flex-shrink-0">
          <ConfigForm
            config={config}
            configs={configs}
            form={form}
            features={features}
            collisions={collisions}
            onConfigChange={onConfigChange}
            onFormChange={onFormChange}
            onAddToOrder={handleAddToOrder}
            onUpload={handleUpload}
            isPurchasing={isPurchasing}
            isUploading={isUploading}
            renderSketch={renderSketch({
              config: config!,
              form,
              setForm,
              bbox,
              selectedTrails,
              features,
              setFeatures,
              setCollisions,
            })}
            onSubmitSave={saveImage}
            annotationsMode={annotationsMode}
            onAnnotationsModeToggle={() => setAnnotationsMode((m) => !m)}
            canEdit={canEdit}
            imageIsStale={imageIsStale}
          />
          {isAdmin && configId && (
            <div className="border-t border-gray-200 mt-4 pt-4 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Location &amp; Trails
              </p>
              <div className="flex gap-2 mb-4">
                <a
                  href="/geojson.io/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 text-center bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded transition-colors"
                >
                  Open Map Editor
                </a>
                <button
                  type="button"
                  onClick={loadLocationFromLocalStorage}
                  className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition-colors"
                  title="Pull the bbox/trails last drawn in the Map Editor into this map"
                >
                  Reload from Map Editor
                </button>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Save as Variant
              </p>
              {/* <input
                type="text"
                value={variantLabel}
                onChange={(e) => setVariantLabel(e.target.value)}
                placeholder="Variant label (e.g. Desert Sunset)"
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-teal-400"
              /> */}
              <button
                type="button"
                onClick={handleSaveVariant}
                // disabled={savingVariant || !variantLabel.trim()}
                className="w-full py-1.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-white text-xs font-semibold rounded transition-colors"
              >
                {savingVariant ? "Saving…" : "Save Variant →"}
              </button>
            </div>
          )}
        </div>
        {/* Main Content */}
        <div className="flex-1">
          <P5Canvas
            mapImageIsExpanded={mapImageIsExpanded}
            toggleMapImageIsExpanded={toggleMapImageIsExpanded}
            p5Ref={p5Ref}
            p5MountRef={p5MountRef}
            isLoading={isRendering}
            sketchDims={sketchDims}
            printType={form["print.type"]}
            printSize={form["print.size"]}
            // annotations={annotations}
            form={form}
            onFormChange={onFormChange}
            annotationsMode={annotationsMode}
            // onAnnotationsChange={setAnnotations}
          />
        </div>
      </div>
    </div>
  );
};
