import React, { useEffect } from "react";
import p5 from "p5";
import { MapConfig } from "../configs/schema";
import { Maximize2, Minimize2 } from "lucide-react";

export const P5Canvas = ({
  config,
  isFullscreen,
  p5Ref,
  setIsFullscreen,
  renderSketch,
  isLoading,
}: {
  config: MapConfig;
  isFullscreen: boolean;
  p5Ref: React.RefObject<HTMLDivElement> | null;
  setIsFullscreen: (value: boolean) => void;
  renderSketch: () => p5 | undefined;
  isLoading: boolean;
}) => {
  useEffect(() => {
    const myp5 = renderSketch();
    return () => {
      myp5?.remove();
    };
  }, [config]);
  return (
    <div className={"ml-80 mt-15"}>
      <div ref={p5Ref} className={`relative inset-0`}>
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/60 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
};
