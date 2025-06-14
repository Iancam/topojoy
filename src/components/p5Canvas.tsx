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
    <div className={"ml-90 mt-15"}>
      <div ref={p5Ref} className={`relative inset-0`} />
    </div>
  );
};
