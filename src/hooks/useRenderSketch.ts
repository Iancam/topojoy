import { convertToNestedObject, LS } from "@/lib/utils";
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
        ) => {
          setSketchDims({ width: sketch.width, height: sketch.height });
          setForm((prev: any) => ({
            ...prev,
            "print.imageWidth": sketch.width,
            "print.imageHeight": sketch.height,
          }));
          const png = canvas.elt.toDataURL("image/png");
          const img = new Image();
          img.src = png!;
          img.width = sketch.width;
          img.height = sketch.height;
          img.style.width = `${sketch.width}px`;
          img.style.height = `${sketch.height}px`;
          img.style.maxWidth = `${sketch.width}px`;
          img.style.display = "block";
          img.style.position = "absolute";
          img.style.top = "0";
          img.style.left = "0";
          img.style.zIndex = "-1";

          p5MountRef.current?.appendChild(img); // 2. use <img>, not <canvas>
          sketch.remove();
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
  };
}
