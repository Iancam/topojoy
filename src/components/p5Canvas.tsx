import React, { useEffect } from "react";
import p5 from "p5";
import { MapConfig } from "../configs/schema";
import { Maximize2, Minimize2 } from "lucide-react";

export const P5Canvas = ({
  mapImageIsExpanded,
  p5Ref,
  toggleMapImageIsExpanded,
  isLoading,
}: {
  mapImageIsExpanded: boolean;
  p5Ref: React.RefObject<HTMLDivElement> | null;
  toggleMapImageIsExpanded: (e: React.MouseEvent) => void;
  isLoading: boolean;
}) => {
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
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/60 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
};
