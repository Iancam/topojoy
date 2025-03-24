import React from "react";
import { useRef, useEffect, useState } from "react";
import { get } from "lodash-es";
import p5 from "p5";
import { sketch } from "./sketch";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./components/ui/tooltip";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox.tsx";
import { DualRangeSlider } from "./components/ui/dual-range-slider.tsx";
import { Slider } from "./components/ui/slider.tsx";
import { Info } from "lucide-react";
import "./index.css";

// Import configs with correct paths
import { SnowMesaConfig } from "./configs/snowMesaConfig.ts";
import { EmeraldLakesConfig } from "./configs/emeraldLakesConfig.ts";
import { LHKConfig } from "./configs/LHKConfig.ts";
import { SawtoothConfig } from "./configs/sawtoothConfig.ts";
import { Config } from "./types.ts";

interface ColorPlan {
  height: number;
  colors: string | string[] | ((params: any) => string);
}

interface Configs {
  [key: string]: Config;
}

interface FormElements {
  [key: string]: [string, string, any];
}

interface TooltipWrapperProps {
  children: React.ReactNode;
}

type FormElementType = "number" | "boolean" | "list" | "range" | "slider";

const formElements: FormElements = {
  "curve.countScalar": ["number", "the density of the background squiggles", 1],
  "trail.stepCount": [
    "number",
    "the length of each squiggle in the trail. Higher numbers make a thicker trail",
    8,
  ],
  "trail.show": ["boolean", "show/hide trails", true],
  "river.stepCount": [
    "number",
    "the length of each squiggle in the rivers. Higher numbers make thicker rivers",
    8,
  ],
  "river.streams": ["boolean", "show/hide streams", false],
  "river.show": ["boolean", "show/hide rivers", true],
  "mountain.keepList": ["list", "mountains to show", []],
  "mountain.drop": [
    "boolean",
    "if checked, mountains not in the keepList will be dropped",
    false,
  ],
  "mountain.show": ["boolean", "show/hide mountains", true],
  "backgroundText.text": ["textarea", "the text in the background", ""],
  "backgroundText.elevationRange": [
    "range",
    "the elevations where the background text will be visible",
    [0.7, 1],
  ],
  crossHatch: [
    "boolean",
    "display a crosshatch, as opposed to the standard elevation lines",
    false,
  ],
};

export const App = () => {
  const p5Ref = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<string>("Original");
  const [configs] = useState<Configs>({
    Original: SnowMesaConfig,
    "Juniper Bark": EmeraldLakesConfig,
    Mint: LHKConfig,
    Sawtooth: SawtoothConfig,
  });

  useEffect(() => {
    let downstreamConfig = configs[config];
    const geoJSON = JSON.parse(localStorage.getItem("topojoy:geojson") || "{}");
    if (!p5Ref.current) return;

    const myp5 = new p5(sketch(geoJSON, 13, downstreamConfig), p5Ref.current);
    return () => {
      myp5.remove();
    };
  }, [config, configs]);

  const handleChange = (key: string, value: any) => {
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let current = configs[config];

    for (const k of keys) {
      current = current[k];
    }
    current[lastKey] = value;

    // Force re-render
    setConfig((prev) => prev);
  };

  const renderFormElement = (
    key: string,
    elementType: FormElementType,
    description: string
  ): React.ReactElement | null => {
    const TooltipWrapper = ({ children }: TooltipWrapperProps) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent>
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const value = get(configs[config], key);

    const cases: Record<FormElementType, React.ReactElement> = {
      number: (
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(key, Number(e.target.value))}
          />
          <TooltipWrapper>
            <Info className="h-4 w-4" />
          </TooltipWrapper>
        </div>
      ),
      boolean: (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value}
            onCheckedChange={(checked) => handleChange(key, checked)}
          />
          <TooltipWrapper>
            <Info className="h-4 w-4" />
          </TooltipWrapper>
        </div>
      ),
      list: (
        <div className="flex items-center space-x-2">
          <Input
            value={Array.isArray(value) ? value.join(",") : ""}
            onChange={(e) =>
              handleChange(
                key,
                e.target.value.split(",").map((s) => s.trim())
              )
            }
          />
          <TooltipWrapper>
            <Info className="h-4 w-4" />
          </TooltipWrapper>
        </div>
      ),
      range: (
        <div className="flex items-center space-x-2">
          <DualRangeSlider
            min={0}
            max={1}
            step={0.01}
            value={value}
            onValueChange={(val) => handleChange(key, val)}
          />
          <TooltipWrapper>
            <Info className="h-4 w-4" />
          </TooltipWrapper>
        </div>
      ),
      slider: (
        <div className="flex items-center space-x-2">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[Number(value)]}
            onValueChange={([val]) => handleChange(key, val)}
            className="w-full"
          />
          <span className="text-sm w-12 text-right">
            {Number(value).toFixed(2)}
          </span>
          <TooltipWrapper>
            <Info className="h-4 w-4" />
          </TooltipWrapper>
        </div>
      ),
    };

    return cases[elementType] || null;
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <form className="space-y-4">
          <select
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            className="p-2 border rounded"
          >
            {Object.keys(configs).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {Object.entries(formElements).map(([key, [type, description]]) => (
            <div key={key} className="flex flex-col gap-2">
              <label className="text-sm font-medium">{key}</label>
              {renderFormElement(key, type as FormElementType, description)}
            </div>
          ))}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Color Plans</h2>
            {configs[config].colorPlan.map(
              (colorPlan: ColorPlan, index: number) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 p-2 border rounded"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Height {index + 1}
                    </label>
                    <span className="text-sm text-gray-500">
                      {colorPlan.height.toFixed(2)}
                    </span>
                  </div>
                  {renderFormElement(
                    `colorPlan.${index}.height`,
                    "slider",
                    `Set the height value for color plan ${index + 1}`
                  )}
                </div>
              )
            )}
          </div>
        </form>
      </div>
      <div ref={p5Ref} />
    </div>
  );
};
