import React from "react";
import { Info } from "lucide-react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { DualRangeSlider } from "./ui/dual-range-slider";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";
import { Config } from "../types";
import { Slider } from "./ui/slider";
import p5 from "p5";

interface FormElements {
  [key: string]: [string, string, any];
}
type FormElementType = "number" | "boolean" | "list" | "range" | "slider";

export const formElements: FormElements = {
  "curve.countScalar": ["number", "the density of the background squiggles", 1],
  zoomLevel: ["number", "the zoom level of the map", 13],
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

interface TooltipWrapperProps {
  children: React.ReactNode;
}

interface ColorPlan {
  height: number;
  colors: string | string[] | ((params: any) => string);
}

interface ConfigFormProps {
  config: string;
  configs: { [key: string]: Config };
  form: any;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFormChange: (key: string, value: any) => void;
  renderSketch: () => p5;
}

export const ConfigForm = ({
  config,
  configs,
  form,
  onConfigChange,
  onFormChange,
  renderSketch,
}: ConfigFormProps) => {
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

    const value = form[key];

    const cases: Record<FormElementType, React.ReactElement> = {
      number: (
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => onFormChange(key, Number(e.target.value))}
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
            onCheckedChange={(checked) => onFormChange(key, checked)}
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
              onFormChange(
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
            onValueChange={(val) => onFormChange(key, val)}
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
            onValueChange={([val]) => onFormChange(key, val)}
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
    <>
      <form className="space-y-6 pb-16">
        <div className="bg-white pb-4 border-b mb-4">
          <label
            className="text-sm font-medium mb-2 block"
            htmlFor="config-select"
          >
            Color Scheme
          </label>
          <select
            id="config-select"
            value={config}
            onChange={onConfigChange}
            className="w-full p-2 border rounded"
          >
            {Object.keys(configs).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

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
      <div className="sticky bottom-0 left-0 bg-white border-t p-3 flex justify-end space-x-3 shadow-lg">
        <button
          onClick={renderSketch}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Render</span>
        </button>
      </div>
    </>
  );
};
