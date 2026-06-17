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
];

const OVERLAY_KEYS = [
  "mountain.keepList",
  "trail.keepList",
  "river.keepList",
  "lake.keepList",
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

  const [mapImageIsExpanded, setMapImageIsExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  // const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsMode, setAnnotationsMode] = useState(false);

  // Track if the current user can edit this map

  const cartContext = useCartContext();

  const { toast, setToast } = useToast();

  const {
    renderSketch,
    dimensions,
    sketchDims,
    p5MountRef,
    p5Ref,
    isInitialRun,
    redrawFnsRef,
  } = useRenderSketch({
    setIsRendering,
  });

  const {
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
  } = useLoadMap({
    user,
    setIsRendering,
    setToast,
    renderSketch,
  });

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
  }
  const onConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(e.target.value);
    setForm(addHeightsToForm(configs[e.target.value], form));
  };

  const toggleMapImageIsExpanded = () => {
    const expanded = !mapImageIsExpanded;
    setMapImageIsExpanded(expanded);
    console.log(sketchDims);
    console.log("toggling map image is expanded");
    const img = p5MountRef.current?.firstElementChild;
    if (img instanceof HTMLImageElement) {
      if (expanded) {
        img.style.width = `${sketchDims.width}px`;
        img.style.height = `${sketchDims.height}px`;
        img.style.maxWidth = `${sketchDims.width}px`;
        img.style.maxHeight = `${sketchDims.height}px`;
        img.style.top = "0";
        img.style.left = "0";
        img.style.transform = "";
      } else {
        fitToParent(img, dimensions, sketchDims);
      }
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

      {/* Toast */}
      {toast && <Toast toast={toast} setToast={setToast} />}
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80"></div>
        <div className="w-80 fixed top-15 left-0 h-full overflow-y-auto border-r bg-white p-4 flex-shrink-0">
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
          />
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
