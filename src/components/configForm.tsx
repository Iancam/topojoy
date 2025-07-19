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
import MultiSelect from "./ui/multiselect";
import {
  basicFormElements,
  advancedFormElements,
  FormElementType,
} from "./configFormData";

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
  trails: any;
  mountains: any;
  waterFeatures: any;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFormChange: (key: string, value: any) => void;
  renderSketch: () => p5;
}

export const ConfigForm = ({
  config,
  configs,
  form,
  trails,
  mountains,
  waterFeatures,
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
    const options =
      key === "mountain.keepList"
        ? mountains
        : key === "river.keepList"
        ? waterFeatures
        : key === "trail.keepList"
        ? trails
        : [];

    const cases: Record<FormElementType, React.ReactElement> = {
      text: (
        <Input
          type="text"
          value={value}
          onChange={(e) => onFormChange(key, e.target.value)}
        />
      ),
      textarea: (
        <textarea
          className="border border-gray-300 rounded p-2 w-full"
          rows={5}
          cols={20}
          value={value}
          onChange={(e) => onFormChange(key, e.target.value)}
        />
      ),
      number: (
        <Input
          type="number"
          value={value}
          onChange={(e) => onFormChange(key, Number(e.target.value))}
        />
      ),
      boolean: (
        <Checkbox
          checked={value}
          onCheckedChange={(checked) => onFormChange(key, checked)}
        />
      ),
      list: (
        <MultiSelect
          options={options}
          value={value}
          onChange={(v) => onFormChange(key, v)}
        />
      ),
      range: (
        <DualRangeSlider
          min={0}
          max={1}
          step={0.01}
          value={value}
          onValueChange={(val) => onFormChange(key, val)}
        />
      ),
      slider: (
        <>
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
        </>
      ),
    };

    const element = cases[elementType] || null;
    return (
      <div key={key} className="flex flex-col gap-2">
        <label className="text-sm font-medium">{key}</label>
        <div className="flex items-center space-x-2">
          {element}
          <TooltipWrapper>
            <Info className={"h-4 w-4 tooltip-" + key.replace(".", "-")} />
          </TooltipWrapper>
        </div>
      </div>
    );
  };

  return (
    <>
      <form className="space-y-6 m-2 pb-16">
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

        {Object.entries(basicFormElements).map(([key, [type, description]]) =>
          renderFormElement(key, type, description)
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold color-height">Color Plans</h2>
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
          <h2 className="text-lg font-semibold">Advanced</h2>
          {Object.entries(advancedFormElements).map(
            ([key, [type, description]]) =>
              renderFormElement(key, type, description)
          )}
        </div>
      </form>
      <div className="sticky bottom-15 left-0 bg-white border-t p-3 flex justify-end space-x-3 shadow-lg">
        <button
          id="render-sketch"
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
