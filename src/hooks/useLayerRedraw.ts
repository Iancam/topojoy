import { useEffect, useRef } from "react";
import { convertToNestedObject } from "@/lib/utils";
import { configs } from "@/mapConfigs";
import { SketchRedrawFns } from "./useRenderSketch";

type UseLayerRedrawOptions = {
  keys: string[];
  form: Record<string, any> | null;
  config: string | null;
  redrawFnsRef: React.RefObject<SketchRedrawFns | null>;
  redrawFn: (fns: SketchRedrawFns, nestedForm: any) => void;
  debounceMs?: number;
  setIsRendering: (v: boolean) => void;
};

export const useLayerRedraw = ({
  keys,
  form,
  config,
  redrawFnsRef,
  redrawFn,
  debounceMs = 400,
  setIsRendering,
}: UseLayerRedrawOptions) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshot = JSON.stringify(
    keys.reduce((acc, k) => ({ ...acc, [k]: form?.[k] }), {}),
  );

  useEffect(() => {
    if (!redrawFnsRef.current || !form || !config) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!redrawFnsRef.current) return;
      setIsRendering(true);
      const nestedForm = convertToNestedObject(form, configs[config]);
      redrawFn(redrawFnsRef.current, nestedForm);
      setIsRendering(false);
    }, debounceMs);
  }, [snapshot]);
};
