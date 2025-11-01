import { useState, useRef, useEffect } from "react";
import { TourMap } from "./walkthrough";
import p5 from "p5";
import { sketchFactory } from "./map/sketch";

import { formElements } from "./components/configFormData";

import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
// Import configs with correct paths
import { snowMesaConfig, emeraldLakesConfig } from "./configs/index.ts";
import { MapConfig } from "./configs/schema.ts";
import { ConfigForm } from "./components/configForm.tsx";
import { P5Canvas } from "./components/p5Canvas.tsx";
import {
  getGeoJSONFromOSM,
  getFeatures,
  getUserSelectedTrailsLatLng,
} from "./map/trails.js";
import { tilesForFeatures } from "./map/processImage.js";
import { getMapConfig } from "./api.ts";
import { saveMapConfig } from "./lib/utils";
import { useUser } from "@clerk/clerk-react";
import { Link, useSearchParams } from "react-router";
import { addHeightsToForm, convertToNestedObject } from "./lib/utils";
import { uniq } from "lodash";
interface Configs {
  [key: string]: MapConfig;
}

const configs: Configs = {
  Original: snowMesaConfig,
  "Juniper Bark": emeraldLakesConfig,
};

export const App = () => {
  // get config id from url
  const configId = useSearchParams()[0].get("configId");
  const [config, setConfig] = useState(() => {
    // Load previously selected config from localStorage if it exists
    const saved = localStorage.getItem("topojoy:config");
    return saved && Object.keys(configs).includes(saved) ? saved : "Original";
  });
  const [loadedConfig, setLoadedConfig] = useState<MapConfig | null>(null);
  const { isSignedIn, user } = useUser();

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

  const [features, setFeatures] = useState<{ [key: string]: string[] }>({});
  const [bbox, setBbox] = useState<any>(null);
  const [selectedTrails, setSelectedTrails] = useState<string[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const p5Ref = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (configId) {
      console.log(configId);
      // get config from db
      getMapConfig(user?.id!, configId).then((config) => {
        console.log(config);
        setLoadedConfig(config);
        setConfig(config.config);
        setForm({ ...preForm, ...config });
        setSelectedTrails(config.selectedTrails);
        setBbox(config.bbox);
        // set fealures
        const feats = config.features.reduce(
          (acc, feat) => {
            if (!acc[feat.type]) {
              acc[feat.type] = [];
            }
            acc[feat.type].push(feat.name);
            return acc;
          },
          {} as Record<string, string[]>
        );
        setFeatures(feats);
      });
    } else {
      const downstreamConfig = convertToNestedObject(form, configs[config]);
      const bbox = JSON.parse(
        localStorage.getItem("topojoy:geojson.bbox") || "{}"
      );
      const { bounds } = tilesForFeatures(bbox, downstreamConfig.zoomLevel);
      getGeoJSONFromOSM(bounds.latLngbox).then((geoJSON) => {
        const feats = getFeatures(
          { box: bounds, zoom: downstreamConfig.zoomLevel },
          geoJSON
        );
        setFeatures(feats);
      });
    }
  }, []);

  const tour = TourMap();

  const renderSketch = () => {
    const nestedForm = convertToNestedObject(form, configs[config]);
    if (!p5Ref.current) return;
    let myBbox = bbox;
    let mySelectedTrails = selectedTrails;
    if (!myBbox) {
      console.log("loading bbox from localStorage");
      myBbox = JSON.parse(localStorage.getItem("topojoy:geojson.bbox") || "{}");
    }
    if (!mySelectedTrails.length) {
      console.log("loading selectedTrails from localStorage");
      mySelectedTrails = getUserSelectedTrailsLatLng();
    }

    // show loading while rendering
    setIsRendering(true);

    while (p5Ref.current.firstChild) {
      p5Ref.current.removeChild(p5Ref.current.firstChild);
    }

    const { sketch } = sketchFactory(
      myBbox,
      mySelectedTrails,
      nestedForm,
      (canvas: { elt: HTMLCanvasElement }, sketch: p5, features: any) => {
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

    // save form, geojson.bbox, geojson.trails, config,
    // to database using api

    return myp5;
  };

  // Trigger a PNG download from the latest rendered image
  const saveImage = () => {
    const container = p5Ref.current;
    if (!container) return;

    const download = () => {
      const img = container.querySelector("img") as HTMLImageElement | null;
      if (!img) return;
      // console.log(form);
      //human readable date
      const date = new Date().toISOString();
      const a = document.createElement("a");
      a.href = img.src;
      a.download = `topojoy-${form["title.text"]}-${date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // If an image is present, download immediately. Otherwise render then wait.
    if (container.querySelector("img")) {
      download();
    }
  };

  const onFormChange = (key: string, value: any) => {
    // console.log(key, value);
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
      {/* Header */}
      <div className="text-white bg-slate-800 font-sans px-3 flex justify-between h-15 fixed top-0 left-0 right-0">
        <div className="font-extrabold flex items-center tracking-wide text-base">
          <Link to="/">TopoJoy</Link>
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
            <div className="pr-3"></div>
            <SignedIn>
              <Link to="/my-maps">
                {/* make it look good */}
                <span className="text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">
                  My Maps
                </span>
              </Link>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
            <SignedOut>
              <Link to="/sign-in">Sign In</Link>
            </SignedOut>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 fixed top-15 left-0 h-full overflow-y-auto border-r bg-white p-4 flex-shrink-0">
          <ConfigForm
            config={config}
            configs={configs}
            form={form}
            features={features}
            onConfigChange={onConfigChange}
            onFormChange={onFormChange}
            renderSketch={renderSketch}
            onSubmitSave={saveImage}
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
