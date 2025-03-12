import React, { useEffect, useState, useRef } from "react";
import p5 from "p5";
import { sketch } from "./sketch";
import { EmeraldLakesConfig } from "../data/emeraldLakesConfig";
import { LHKConfig } from "../data/LHKConfig";
import { SnowMesaConfig } from "../data/snowMesaConfig.ts";
import { SawtoothConfig } from "../data/sawtoothConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { Info } from "lucide-react";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox.tsx";
import { DualRangeSlider } from "./components/ui/dual-range-slider.tsx";
import "./index.css";
export const App = () => {
  const p5Ref = useRef(null);
  const configs = {
    Original: SnowMesaConfig,
    "Juniper Bark": EmeraldLakesConfig,
    Mint: LHKConfig,
    Sawtooth: SawtoothConfig,
  };

  const [config, setConfig] = useState("Original");

  const formElements = {
    "curve.countScalar": [
      "number",
      "the density of the background squiggles",
      1,
    ],
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

  const [formValues, setFormValues] = useState(
    Object.entries(formElements)
      .map(([key, [type, description, value]]) => ({ key, value }))
      .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {})
  );

  useEffect(() => {
    let downstreamConfig = configs[config];

    // assign form values to downstream config
    Object.entries(formValues).forEach(([key, value]) => {
      const keys = key.split(".");
      let counter = 0;
      keys.reduce((object, key) => {
        if (counter === keys.length - 1) {
          object[key] = value;
        } else {
          object[key] = object[key] || {};
        }
        counter++;
        return object[key];
      }, downstreamConfig);
    });

    const geojson = localStorage.getItem("topojoy:geojson");
    if (!geojson) throw new Error("No geojson found in localStorage");
    const p5Instance = new p5(
      sketch(JSON.parse(geojson), 13, downstreamConfig),
      p5Ref.current
    );
    return () => {
      p5Instance.remove();
    };
  }, [formValues, config]);

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderFormElement = (
    key: string,
    type: string,
    description: string
  ) => {
    //
    const keys = key.split(".");
    // const value = keys.reduce((object, key) => {
    //   object[key] = object[key] || {};
    //   return object[key];
    // }, configs[config]);

    const value = formValues[key];

    const TooltipWrapper = ({ children }: any) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help ml-2">
              <Info size={16} className="text-gray-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
        {children}
      </TooltipProvider>
    );

    const cases = {
      number: (
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className="w-24"
          />
          <TooltipWrapper />
        </div>
      ),
      boolean: (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value}
            onCheckedChange={(checked) => handleChange(key, checked)}
          />
          <TooltipWrapper />
        </div>
      ),
      list: (
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder="Enter comma-separated list"
            className="w-64"
          />
          <TooltipWrapper />
        </div>
      ),
      textarea: (
        <div className="flex items-center space-x-2">
          <textarea
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder="Enter background text"
            className="w-64"
          />
          <TooltipWrapper />
        </div>
      ),
      range: (
        <div className="flex items-center space-x-4">
          <DualRangeSlider
            label={(value) => <span>{value}℃</span>}
            value={value}
            onValueChange={(values) => {
              console.log(values);

              handleChange(key, values);
            }}
            min={0}
            max={100}
            step={1}
          />
          <span>{value}%</span>
          <TooltipWrapper />
        </div>
      ),
    };

    return cases[type] || null;
  };

  return (
    <div>
      <div
        style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}
        ref={p5Ref}
      />
      <div className="p-6 bg-white/70 rounded-lg shadow-md w-md">
        <h2 className="text-2xl font-bold mb-4">Map Configuration</h2>
        <form className="space-y-4">
          <select
            name="config"
            id=""
            onChange={(e) => setConfig(e.target.value)}
          >
            {Object.keys(configs).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {Object.entries(formElements).map(([key, [type, description]]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="font-medium">{key}</label>
              {renderFormElement(key, type, description)}
            </div>
          ))}
        </form>
      </div>
    </div>
  );
};
