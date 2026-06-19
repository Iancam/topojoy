import { convertToNestedObject, fitToParent, LS } from "@/lib/utils";
import { sketchFactory } from "@/map/sketch";
import { configs } from "@/mapConfigs";
import _ from "lodash";
import p5 from "p5";
import { useEffect, useRef, useState } from "react";

export type RenderSketchParams = {
  config: string;
  form: any;
  setForm: (form: any) => void;
  bbox: any;
  selectedTrails: string[];
  features: Record<string, string[]>;
  setFeatures: (features: Record<string, string[]>) => void;
  setCollisions: (collisions: Record<string, string[]>) => void;
};

export type SketchLayers = {
  curvesBack: p5.Graphics;
  text: p5.Graphics;
  curvesFront: p5.Graphics;
  overlay: p5.Graphics;
};

export type SketchRedrawFns = {
  recompose: () => void;
  redrawTextLayer: (newConfig: any) => void;
  redrawOverlayLayer: (
    newConfig: any,
    newFeatures?: any,
    newUserSelectedTrails?: any,
  ) => void;
};

export function useRenderSketch({
  setIsRendering,
}: {
  setIsRendering: (isRendering: boolean) => void;
}) {
  const [isInitialRun, setIsInitialRun] = useState(() => {
    const isInitialRun = JSON.parse(
      localStorage.getItem(LS.IS_DEFAULT_KEEP_LIST_SET) || "false",
    );
    return isInitialRun;
  });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [sketchDims, setSketchDims] = useState({ width: 0, height: 0 });
  const p5Ref = useRef<HTMLDivElement>(null);
  const p5MountRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<SketchLayers | null>(null);
  const redrawFnsRef = useRef<SketchRedrawFns | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const displayImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Ensure the ref is attached to a current DOM node
    if (!p5Ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Access the dimensions from the first entry
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    });

    // Start observing the parent div
    resizeObserver.observe(p5Ref.current);

    // Cleanup function to stop observing when the component unmounts
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const renderSketch =
    ({
      config,
      form,
      setForm,
      bbox,
      selectedTrails,
      setFeatures,
      setCollisions,
    }: {
      config: string;
      form: any;
      setForm: (form: any) => void;
      bbox: any;
      selectedTrails: string[];
      features: Record<string, string[]>;
      setFeatures: (features: Record<string, string[]>) => void;
      setCollisions: (collisions: Record<string, string[]>) => void;
    }) =>
    () => {
      let nestedForm = convertToNestedObject(form, configs[config]);
      if (isInitialRun || nestedForm.forceCollisionDetection) {
        nestedForm.mountain.drop = false;
        nestedForm.river.drop = false;
        nestedForm.trail.drop = false;
        nestedForm.lake.drop = false;

        // set all keeplists to empty
        nestedForm.mountain.keepList = [];
        nestedForm.river.keepList = [];
        nestedForm.trail.keepList = [];
        nestedForm.lake.keepList = [];
      } else {
        nestedForm.mountain.drop = true;
        nestedForm.river.drop = true;
        nestedForm.trail.drop = true;
        nestedForm.lake.drop = true;
      }

      // if (!p5Ref.current) return;
      let myBbox = bbox;

      let mySelectedTrails = selectedTrails;
      // show loading while rendering
      setIsRendering(true);

      const mountNode = p5MountRef.current;
      if (!mountNode) return;

      // Destroy previous p5 instance and free its GPU buffers before re-rendering
      if (p5InstanceRef.current) {
        const prev = layersRef.current;
        console.log(prev);
        if (prev) {
          prev.curvesBack.remove();
          prev.text.remove();
          prev.curvesFront.remove();
          prev.overlay.remove();
        }
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
        layersRef.current = null;
        redrawFnsRef.current = null;
        displayImgRef.current = null;
      }

      while (mountNode.firstChild) {
        mountNode.removeChild(mountNode.firstChild);
      }

      // (while (p5Ref.current.firstChild) {
      //   p5Ref.current.removeChild(p5Ref.current.firstChild);
      // )}

      const { sketch } = sketchFactory(
        myBbox,
        mySelectedTrails,
        nestedForm,
        (
          canvas: { elt: HTMLCanvasElement },
          sketch: p5,
          keepLists: any,
          sketchCollisions: Record<string, string[]>,
          sketchFeatures: Record<string, string[]>,
          layers: SketchLayers,
          redrawFns: SketchRedrawFns,
          resolvedTextSizeMultiplier: number,
        ) => {
          layersRef.current = layers;

          // Wrap each redraw fn so the displayed <img> is updated after every call
          const updateImg = () => {
            if (displayImgRef.current) {
              displayImgRef.current.src = canvas.elt.toDataURL("image/png");
            }
          };
          redrawFnsRef.current = {
            recompose: () => {
              redrawFns.recompose();
              updateImg();
            },
            redrawTextLayer: (newConfig) => {
              redrawFns.redrawTextLayer(newConfig);
              updateImg();
            },
            redrawOverlayLayer: (newConfig, newFeatures?, newTrails?) => {
              redrawFns.redrawOverlayLayer(newConfig, newFeatures, newTrails);
              updateImg();
            },
          };

          setSketchDims({ width: sketch.width, height: sketch.height });
          setForm((prev: any) => ({
            ...prev,
            "print.imageWidth": sketch.width,
            "print.imageHeight": sketch.height,
            textSizeMultiplier: resolvedTextSizeMultiplier,
          }));
          const png = canvas.elt.toDataURL("image/png");
          const img = new Image();
          img.src = png!;
          img.width = sketch.width;
          img.height = sketch.height;
          img.style.width = `${sketch.width}px`;
          img.style.height = `${sketch.height}px`;
          img.style.maxWidth = `${sketch.width}px`;
          img.style.display = "none";
          img.style.position = "absolute";
          img.style.top = "0";
          img.style.left = "0";
          img.style.zIndex = "-1";

          p5MountRef.current?.appendChild(img);
          displayImgRef.current = img;
          // Fit the canvas to the visible container so the default state is minimized
          const canvasEl = p5MountRef.current?.querySelector(
            "canvas",
          ) as HTMLCanvasElement | null;
          if (canvasEl && p5Ref.current) {
            const { width: pw, height: ph } =
              p5Ref.current.getBoundingClientRect();
            if (pw && ph) {
              const scale = Math.min(pw / sketch.width, ph / sketch.height);
              canvasEl.style.width = `${sketch.width * scale}px`;
              canvasEl.style.height = `${sketch.height * scale}px`;
              canvasEl.style.position = "absolute";
              canvasEl.style.top = "0";
              canvasEl.style.left = "0";
            }
          }
          // Keep p5 instance alive for partial redraws; canvas is the visible display layer
          p5InstanceRef.current = sketch;
          if (isInitialRun || form.forceCollisionDetection) {
            setIsInitialRun(false);
            setForm((prev: any) => {
              const mappedKeeplists = {
                "lake.keepList": keepLists.lake || [],
                "mountain.keepList": keepLists.mountain || [],
                "river.keepList": keepLists.river || [],
                "trail.keepList": keepLists.trail || [],
              };
              const newForm = {
                ...prev,
                ...mappedKeeplists,
              };
              return newForm;
            });
            const features = _.mapValues(
              _.mapKeys(sketchFeatures, (value, key) => {
                return key.slice(0, -1);
              }),
              (value) => Object.keys(value),
            );
            setFeatures(features);
            setCollisions(_.cloneDeep(sketchCollisions));
          }

          // hide loading once image is ready
          setIsRendering(false);
        },
      );

      const myp5 = new p5(sketch, p5MountRef.current!);
      myp5.noLoop();

      return myp5;
    };

  return {
    renderSketch,
    dimensions,
    sketchDims,
    p5MountRef,
    p5Ref,
    isInitialRun,
    layersRef,
    redrawFnsRef,
  };
}
