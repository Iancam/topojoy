import React, { useEffect } from "react";
import p5 from "p5";
import { MapConfig } from "../schema";
import { Maximize2, Minimize2 } from "lucide-react";

export const P5Canvas = ({
  config,
  isFullscreen,
  p5Ref,
  setIsFullscreen,
  renderSketch,
}: {
  config: MapConfig;
  isFullscreen: boolean;
  p5Ref: React.RefObject<HTMLDivElement> | null;
  setIsFullscreen: (value: boolean) => void;
  renderSketch: () => p5 | undefined;
}) => {
  useEffect(() => {
    const myp5 = renderSketch();
    return () => {
      myp5?.remove();
    };
  }, [config]);
  return (
    <div
      className={`flex-1 relative transition-all duration-300 ${
        isFullscreen ? "ml-0" : "ml-80"
      }`}
    >
      <div ref={p5Ref} className={`absolute inset-0`} />
      <button
        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg"
        onClick={() => setIsFullscreen(!isFullscreen)}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
