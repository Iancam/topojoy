import { useState, useRef, useEffect } from "react";

import p5 from "p5";
import { sketchFactory } from "./sketch";

import { formElements } from "./components/configForm";

// Import configs with correct paths
import { SnowMesaConfig } from "./configs/snowMesaConfig.ts";
import { EmeraldLakesConfig } from "./configs/emeraldLakesConfig.ts";
import { LHKConfig } from "./configs/LHKConfig.ts";
import { SawtoothConfig } from "./configs/sawtoothConfig.ts";
import { Config } from "./types.ts";
import { MapConfig } from "./schema.ts";
import { ConfigForm } from "./components/configForm.tsx";
import { P5Canvas } from "./components/p5Canvas.tsx";
import {
  getGeoJSONFromOSM,
  getMountainFeatures,
  getTrails,
  getWaterFeatures,
} from "./trails.js";
import { tilesForFeatures } from "./processImage.js";

interface Configs {
  [key: string]: MapConfig;
}

const configs: Configs = {
  Original: SnowMesaConfig,
  "Juniper Bark": EmeraldLakesConfig,
  Mint: LHKConfig,
  Sawtooth: SawtoothConfig,
};

export const App = () => {
  const [config, setConfig] = useState("Original");

  const addHeightsToForm = (config: MapConfig, form: {}) => {
    const heights = config.colorPlan.reduce((obj, { height }, i) => {
      const key = `colorPlan.${i}.height`;
      obj[key] = height;
      return obj;
    }, {});
    Object.keys(form)
      .filter((k) => k.startsWith("colorPlan"))
      .forEach((k) => {
        delete form[k];
      });
    return { ...form, ...heights };
  };
  const preForm = Object.entries(formElements).reduce(
    (obj, [key, [_, __, value]]) => {
      obj[key] = value;
      return obj;
    },
    {}
  );
  const [form, setForm] = useState(addHeightsToForm(configs[config], preForm));

  const [trails, setTrails] = useState<string[]>([]);
  const [mountains, setMountains] = useState<string[]>([]);
  const [waterFeatures, setWaterFeatures] = useState<string[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const p5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const downstreamConfig = getDownstreamConfig();
    const geoJSON = JSON.parse(localStorage.getItem("topojoy:geojson") || "{}");
    const { bounds } = tilesForFeatures(geoJSON, downstreamConfig.zoomLevel);
    const mapGeoJSON = getGeoJSONFromOSM(bounds.latLngbox, {
      streams: downstreamConfig.river.streams,
      rivers: downstreamConfig.river.show,
      trails: downstreamConfig.trail.show,
      peaks: downstreamConfig.mountain.show,
      lakes: false,
    }).then((geoJSON) => {
      const mountains = getMountainFeatures(bounds, geoJSON);
      const waterFeatures = getWaterFeatures(bounds, geoJSON);
      const trails = getTrails(bounds, geoJSON);
      setMountains(Object.keys(mountains));
      setWaterFeatures(Object.keys(waterFeatures));
      setTrails(Object.keys(trails));
    });
  }, [
    form["river.streams"],
    form["river.show"],
    form["trail.show"],
    form["mountain.show"],
  ]);

  const getDownstreamConfig = () => {
    let downstreamConfig = configs[config];
    for (const [key, value] of Object.entries(form)) {
      const keys = key.split(".");
      const lastKey = keys.pop()!;
      let current = downstreamConfig;
      for (const k of keys) {
        current = current[k];
      }
      current[lastKey] = value;
    }
    return downstreamConfig;
  };

  const renderSketch = async () => {
    const downstreamConfig = getDownstreamConfig();
    if (!p5Ref.current) return;

    while (p5Ref.current.firstChild) {
      p5Ref.current.removeChild(p5Ref.current.firstChild);
    }
    const geoJSON = JSON.parse(localStorage.getItem("topojoy:geojson") || "{}");
    const { sketch } = sketchFactory(geoJSON, downstreamConfig);

    const myp5 = new p5(sketch, p5Ref.current);
    return myp5;
    // p5Ref.current = myp5;
  };

  const onFormChange = (key: string, value: any) => {
    setForm({
      ...form,
      [key]: value,
    });
  };
  const onConfigChange = (e) => {
    setConfig(e.target.value);
    setForm(addHeightsToForm(configs[e.target.value], form));
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`w-80 fixed top-0 left-0 h-full overflow-y-auto border-r bg-white p-4 flex-shrink-0 transition-transform duration-300 ${
          isFullscreen ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <ConfigForm
          config={config}
          configs={configs}
          form={form}
          trails={trails}
          mountains={mountains}
          waterFeatures={waterFeatures}
          onConfigChange={onConfigChange}
          onFormChange={onFormChange}
          renderSketch={renderSketch}
        />
      </div>
      {/* Main Content */}
      <P5Canvas
        config={configs[config]}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        renderSketch={renderSketch}
        p5Ref={p5Ref}
      ></P5Canvas>
    </div>
  );
};
