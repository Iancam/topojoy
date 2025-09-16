import { useState, useRef, useEffect } from "react";
import { TourMap } from "./walkthrough";
import p5 from "p5";
import { sketchFactory } from "./map/sketch";

import { formElements } from "./components/configFormData";

// Import configs with correct paths
import { SnowMesaConfig } from "./configs/snowMesaConfig.ts";
import { EmeraldLakesConfig } from "./configs/emeraldLakesConfig.ts";
import { LHKConfig } from "./configs/LHKConfig.ts";
import { SawtoothConfig } from "./configs/sawtoothConfig.ts";
import { MapConfig } from "./schema.ts";
import { ConfigForm } from "./components/configForm.tsx";
import { P5Canvas } from "./components/p5Canvas.tsx";
import {
  getGeoJSONFromOSM,
  getLakes,
  getMountainFeatures,
  getTrails,
  getWaterFeatures,
} from "./map/trails.js";
import { tilesForFeatures } from "./map/processImage.js";

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
  const [config, setConfig] = useState(() => {
    // Load previously selected config from localStorage if it exists
    const saved = localStorage.getItem("topojoy:config");
    return saved && Object.keys(configs).includes(saved) ? saved : "Original";
  });

  // use when you want to delete old values from the heights, IE, when you're
  //changing configs.
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
  const [form, setForm] = useState(() => {
    // Combine default form values with any saved values in localStorage
    const saved = JSON.parse(localStorage.getItem("topojoy:form") || "{}");
    Object.keys(saved).forEach((k) => {
      k.startsWith("colorPlan") &&
        k.endsWith("height") &&
        saved[k] === null &&
        (saved[k] = Infinity);
    });
    const base = addHeightsToForm(configs[config], preForm);
    return { ...base, ...saved };
  });

  const [trails, setTrails] = useState<string[]>([]);
  const [mountains, setMountains] = useState<string[]>([]);
  const [waterFeatures, setWaterFeatures] = useState<string[]>([]);
  const [lakes, setLakes] = useState<string[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const p5Ref = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const downstreamConfig = getDownstreamConfig();
    const geoJSON = JSON.parse(localStorage.getItem("topojoy:geojson") || "{}");
    const { bounds } = tilesForFeatures(geoJSON, downstreamConfig.zoomLevel);
    const mapGeoJSON = getGeoJSONFromOSM(bounds.latLngbox, {
      streams: downstreamConfig.river.streams,
      rivers: downstreamConfig.river.show,
      trails: downstreamConfig.trail.show,
      peaks: downstreamConfig.mountain.show,
      lakes: downstreamConfig.lakes.show,
    }).then((geoJSON) => {
      const mountains = getMountainFeatures(bounds, geoJSON);
      const waterFeatures = getWaterFeatures(bounds, geoJSON);
      const trails = getTrails(bounds, geoJSON);
      const lakes = getLakes(bounds, geoJSON);
      setMountains(Object.keys(mountains));
      setWaterFeatures(Object.keys(waterFeatures));
      setTrails(Object.keys(trails));
      setLakes(Object.keys(lakes));
    });
  }, [
    form["river.streams"],
    form["river.show"],
    form["trail.show"],
    form["mountain.show"],
    form["lakes.show"],
  ]);

  const tour = TourMap();

  const getDownstreamConfig = () => {
    let downstreamConfig = configs[config];
    for (const [key, value] of Object.entries(form)) {
      const keys = key.split(".");
      const lastKey = keys.pop()!;
      let current = downstreamConfig;
      for (const k of keys) {
        // allow configFormData to create new fields without having to edit
        // config Files
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }
      current[lastKey] = value;
    }
    return downstreamConfig;
  };

  const renderSketch = () => {
    const downstreamConfig = getDownstreamConfig();
    if (!p5Ref.current) return;

    // show loading while rendering
    setIsRendering(true);

    while (p5Ref.current.firstChild) {
      p5Ref.current.removeChild(p5Ref.current.firstChild);
    }
    const geoJSON = JSON.parse(localStorage.getItem("topojoy:geojson") || "{}");
    const { sketch } = sketchFactory(
      geoJSON,
      downstreamConfig,
      (canvas: { elt: HTMLCanvasElement }, sketch: p5) => {
        const png = canvas.elt.toDataURL("image/png");
        const img = new Image();
        img.src = png!;

        img.width = sketch.width;
        img.height = sketch.height;
        img.style.width = `${sketch.width}px`;
        img.style.height = `${sketch.height}px`;
        img.style.display = "block";
        img.style.position = "absolute";
        img.style.top = "0";
        img.style.left = "0";
        img.style.zIndex = "-1";
        img.style.maxWidth = `${sketch.width}px`;
        p5Ref.current?.appendChild(img); // 2. use <img>, not <canvas>
        sketch.remove();
        // hide loading once image is ready
        setIsRendering(false);
      }
    );

    const myp5 = new p5(sketch, p5Ref.current);
    myp5.noLoop();

    return myp5;
    // p5Ref.current = myp5;
  };

  const onFormChange = (key: string, value: any) => {
    setForm({
      ...form,
      [key]: value,
    });
  };
  const onConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(e.target.value);
    setForm(addHeightsToForm(configs[e.target.value], form));
  };

  // Persist current config selection
  useEffect(() => {
    localStorage.setItem("topojoy:config", config);
  }, [config]);

  // Persist form entries whenever they change
  useEffect(() => {
    localStorage.setItem("topojoy:form", JSON.stringify(form));
  }, [form]);

  return (
    <>
      <div className="text-white bg-slate-800 font-sans px-3 flex justify-between h-15 fixed top-0 left-0 right-0">
        <div className="font-extrabold flex items-center tracking-wide text-base">
          TopoJoy
        </div>
        <div className="flex-grow flex justify-end">
          <div style={{ height: "42px" }}></div>
          <div
            className="flex items-center bg-pink"
            style={{ fontSize: "10px" }}
          >
            <div className="pr-3"></div>
            <div className="flex items-center ml-auto">
              <a
                className={
                  "bg-indigo-500 hover:bg-indigo-700 start-tour text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200"
                }
                href="/geojson.io/index.html"
              >
                Open Map Editor
              </a>
            </div>
            {/* <div className="flex items-center ml-auto">
              <button
                className={
                  "bg-indigo-500 hover:bg-indigo-700 start-tour text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200"
                }
                onClick={() => {
                  tour.start();
                  console.log("Tour started");
                }}
              >
                Start Tour
              </button>
            </div> */}
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`w-80 fixed top-15 left-0 h-full overflow-y-auto border-r bg-white p-4 flex-shrink-0
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
          isLoading={isRendering}
        ></P5Canvas>
      </div>
    </>
  );
};
