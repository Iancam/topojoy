import React, { useEffect, useState } from "react";
import p5 from "p5";
import { MapConfig } from "../configs/schema";
import { Maximize2, Minimize2 } from "lucide-react";
import { AnnotationLayer } from "./AnnotationLayer";
import type { Annotation } from "./AnnotationLayer";

export const P5Canvas = ({
  mapImageIsExpanded,
  p5Ref,
  p5MountRef,
  toggleMapImageIsExpanded,
  isLoading,
  sketchDims,
  printType,
  printSize,
  form,
  onFormChange,
  // annotations,
  annotationsMode,
  // onAnnotationsChange,
}: {
  mapImageIsExpanded: boolean;
  p5Ref: React.RefObject<HTMLDivElement | null>;
  p5MountRef: React.RefObject<HTMLDivElement | null>;
  toggleMapImageIsExpanded: (e: React.MouseEvent) => void;
  isLoading: boolean;
  sketchDims: { width: number; height: number };
  printType?: string;
  printSize?: { width: number; height: number } | null;
  form: any;
  onFormChange: (formUpdate: any) => void;
  annotations?: Annotation[];
  annotationsMode?: boolean;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const annotations = form.annotations;
  const onAnnotationsChange = (annotations: Annotation[]) => {
    onFormChange({
      annotations,
    });
  };

  React.useEffect(() => {
    if (!printSize || !sketchDims.width || !sketchDims.height) return;

    const printRatio = printSize.width / printSize.height;
    const imageRatio = sketchDims.width / sketchDims.height;

    let cropWidth: number;
    let cropHeight: number;
    if (printRatio > imageRatio) {
      cropWidth = sketchDims.width;
      cropHeight = sketchDims.width / printRatio;
    } else {
      cropHeight = sketchDims.height;
      cropWidth = sketchDims.height * printRatio;
    }

    const cropX = (sketchDims.width - cropWidth) / 2;
    const cropY = (sketchDims.height - cropHeight) / 2;

    console.log("print crop", {
      printType,
      printSize,
      crop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
    });
  }, [printSize, printType, sketchDims.width, sketchDims.height]);

  // Track the rendered image size inside p5Ref so the annotation layer
  // can be positioned to match it exactly.
  // Re-run when mapImageIsExpanded changes because toggleMapImageIsExpanded
  // mutates img inline styles without resizing the container div.
  useEffect(() => {
    const container = p5Ref?.current;
    if (!container) return;

    const update = () => {
      const el =
        container.querySelector("canvas") || container.querySelector("img");
      if (el) {
        setContainerSize({
          width: el.offsetWidth || (el as HTMLImageElement).width,
          height: el.offsetHeight || (el as HTMLImageElement).height,
        });
      }
    };

    // Small delay so inline style changes from toggleMapImageIsExpanded
    // have already been applied before we measure.
    const raf = requestAnimationFrame(update);

    const ro = new ResizeObserver(update);
    const img = container.querySelector("img");
    ro.observe(container);
    if (img) ro.observe(img);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [p5Ref, sketchDims, mapImageIsExpanded]);

  return (
    <div className="relative mt-15 h-full w-full overflow-auto">
      <button
        className="fixed top-15 left-80 bg-white/20 pointer z-50"
        onClick={toggleMapImageIsExpanded}
      >
        {mapImageIsExpanded ? <Minimize2 /> : <Maximize2 />}
      </button>
      <div
        ref={p5Ref}
        className={`relative inset-0 w-[calc(100vw-20rem)] h-full`}
      >
        <div ref={p5MountRef} className="absolute inset-0"></div>
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/60 border-t-transparent" />
          </div>
        )}
        {!isLoading && annotations !== undefined && onAnnotationsChange && (
          <AnnotationLayer
            annotations={annotations}
            annotationsMode={annotationsMode ?? false}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            scale={
              sketchDims.width ? containerSize.width / sketchDims.width : 1
            }
            onChange={onAnnotationsChange}
          />
        )}
      </div>
    </div>
  );
};
