import { useState, useRef, useEffect, use } from "react";
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
import { maps } from "./api.ts";
import {
  fitToParent,
  getFormFromLocalStorage,
  LS,
  normalizeFeatureName,
} from "./lib/utils";
import { useUser } from "@clerk/clerk-react";
import { Link, useSearchParams } from "react-router";
import {
  addHeightsToForm,
  convertToNestedObject,
  upsertMap,
} from "./lib/utils";
import _ from "lodash";
import { Header } from "./components/Header.tsx";

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
  console.log(configId);
  const [config, setConfig] = useState(() => {
    // Load previously selected config from localStorage if it exists
    const saved = localStorage.getItem(LS.CONFIG);
    return Object.keys(configs).includes(saved || "") ? saved : "Original";
  });

  const { isSignedIn, user } = import.meta.env.DEV
    ? useUser()
    : { isSignedIn: false, user: null };

  const preForm = Object.entries(formElements).reduce(
    (obj, [key, [_, __, value]]) => {
      obj[key] = value;
      return obj;
    },
    {}
  );
  const [sketchDims, setSketchDims] = useState({ width: 0, height: 0 });
  const [form, setForm] = useState(() => {
    return getFormFromLocalStorage(preForm, config!, configs);
  });

  const [features, setFeatures] = useState<{ [key: string]: string[] }>({});
  const [bbox, setBbox] = useState<any>(null);
  const [selectedTrails, setSelectedTrails] = useState<string[]>([]);

  const [mapImageIsExpanded, setMapImageIsExpanded] = useState(false);

  const p5Ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [isDefaultKeepListsSet, setIsDefaultKeepListsSet] = useState(() => {
    const keepListsSetPreviousSession = JSON.parse(
      localStorage.getItem(LS.IS_DEFAULT_KEEP_LIST_SET) || "false"
    );
    return keepListsSetPreviousSession;
  });

  const [collisions, setCollisions] = useState<Record<string, string[]>>(() => {
    if (configId) {
      return {};
    }
    const saved = localStorage.getItem(LS.COLLISIONS);
    return saved ? JSON.parse(saved) : {};
  });

  // load config from db, or from local storage
  useEffect(() => {
    if (configId) {
      // get config from db
      maps.get(user?.id!, configId).then((config) => {
        console.log("retrieved config from database", config);
        // setLoadedConfig(config);
        setConfig(config.config);
        setForm({ ...preForm, ...config });
        setSelectedTrails(config.selectedTrails);
        console.log(config.bbox);
        setBbox(config.bbox);
        // set fealures
        const feats = config.features.reduce(
          (acc, feat) => {
            if (!acc[feat.type]) {
              acc[feat.type] = [];
            }
            acc[feat.type].push(normalizeFeatureName(feat.name));
            return acc;
          },
          {} as Record<string, string[]>
        );
        setFeatures(feats);
        renderSketch({
          config: config.config,
          form: { ...preForm, ...config },
          bbox: config.bbox,
          selectedTrails: config.selectedTrails,
          features: feats,
        })();
      });
    } else {
      console.log("loading data from localStorage");
      const downstreamConfig = convertToNestedObject(form, configs[config]);
      const bbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
      const selectedTrails = JSON.parse(
        localStorage.getItem(LS.GEOJSON_SELECTED_TRAIL_SEGMENTS) || "[]"
      );
      const configName = localStorage.getItem(LS.CONFIG) || "Original";
      const form = getFormFromLocalStorage(preForm, configName, configs);

      setBbox(bbox);
      setSelectedTrails(selectedTrails);
      setConfig(configName);
      setForm(form);

      const { bounds } = tilesForFeatures(bbox, downstreamConfig.zoomLevel);
      getGeoJSONFromOSM(bounds.latLngBox).then((geoJSON) => {
        const rawFeats = getFeatures(
          { box: bounds.box, zoom: downstreamConfig.zoomLevel },
          geoJSON
        );
        const feats = Object.entries(rawFeats).reduce(
          (acc, [key, value]) => {
            // key minus trailing s
            const type = key.slice(0, -1);
            acc[type] = Object.keys(value).map(normalizeFeatureName);
            return acc;
          },
          {} as Record<string, string[]>
        );
        setFeatures(feats);
        renderSketch({
          config: configName,
          form,
          bbox,
          selectedTrails,
          features: feats,
        })();
      });
    }
  }, []);

  useEffect(() => {
    // Ensure the ref is attached to a current DOM node
    if (!p5Ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Access the dimensions from the first entry
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    });

    // Start observing the parent div
    resizeObserver.observe(p5Ref.current);

    // Cleanup function to stop observing when the component unmounts
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const tour = TourMap();

  const renderSketch =
    ({
      config,
      form,
      bbox,
      selectedTrails,
      features,
    }: {
      config: string;
      form: any;
      bbox: any;
      selectedTrails: string[];
      features: Record<string, string[]>;
    }) =>
    () => {
      let nestedForm = convertToNestedObject(form, configs[config]);
      if (!isDefaultKeepListsSet || nestedForm.forceCollisionDetection) {
        nestedForm.mountain.drop = false;
        nestedForm.river.drop = false;
        nestedForm.trail.drop = false;
        nestedForm.lake.drop = false;

        // set all keeplists to empty
        nestedForm.mountain.keepList = [];
        nestedForm.river.keepList = [];
        nestedForm.trail.keepList = [];
        nestedForm.lake.keepList = [];
      } else {
        nestedForm.mountain.drop = true;
        nestedForm.river.drop = true;
        nestedForm.trail.drop = true;
        nestedForm.lake.drop = true;
      }

      if (!p5Ref.current) return;
      let myBbox = bbox;
      console.log({ bbox });
      let mySelectedTrails = selectedTrails;
      // if (!myBbox) {
      //   console.log("loading bbox from localStorage");
      //   myBbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
      // }
      // if (!mySelectedTrails.length) {
      //   console.log("loading selectedTrails from localStorage");
      //   mySelectedTrails = getUserSelectedTrailsLatLng();
      // }
      // show loading while rendering
      setIsRendering(true);

      while (p5Ref.current.firstChild) {
        p5Ref.current.removeChild(p5Ref.current.firstChild);
      }

      const { sketch } = sketchFactory(
        myBbox,
        mySelectedTrails,
        nestedForm,
        (
          canvas: { elt: HTMLCanvasElement },
          sketch: p5,
          keepLists: any,
          sketchCollisions: Record<string, string[]>
        ) => {
          setSketchDims({ width: sketch.width, height: sketch.height });
          const png = canvas.elt.toDataURL("image/png");
          const img = new Image();
          img.src = png!;
          img.width = sketch.width;
          img.height = sketch.height;
          img.style.width = `${sketch.width}px`;
          img.style.height = `${sketch.height}px`;
          img.style.maxWidth = `${sketch.width}px`;
          img.style.display = "block";
          img.style.position = "absolute";
          img.style.top = "0";
          img.style.left = "0";
          img.style.zIndex = "-1";

          p5Ref.current?.appendChild(img); // 2. use <img>, not <canvas>
          sketch.remove();
          if (!isDefaultKeepListsSet || form.forceCollisionDetection) {
            setIsDefaultKeepListsSet(true);
            setForm((prev: any) => {
              const mappedKeeplists = {
                "lake.keepList": keepLists.lake || [],
                "mountain.keepList": keepLists.mountain || [],
                "river.keepList": keepLists.river || [],
                "trail.keepList": keepLists.trail || [],
              };
              const newForm = {
                ...prev,
                ...mappedKeeplists,
              };
              return newForm;
            });
            setCollisions(_.cloneDeep(sketchCollisions));
          }

          // hide loading once image is ready
          setIsRendering(false);
        }
      );

      const myp5 = new p5(sketch, p5Ref.current);
      myp5.noLoop();

      // save form, geojson.bbox, geojson.trails, config,
      // to database using api
      console.log({ user, isDefaultKeepListsSet });

      if (user && isDefaultKeepListsSet) {
        console.log("saving map");
        upsertMap(
          form,
          features,
          bbox,
          selectedTrails,
          user,
          config,
          configs[config]
        );
      }

      return myp5;
    };

  // Trigger a PNG download from the latest rendered image
  const saveImage = () => {
    const container = p5Ref.current;
    if (!container) return;

    const download = () => {
      const img = container.querySelector("img") as HTMLImageElement | null;
      if (!img) return;
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
    setForm({
      ...form,
      [key]: value,
    });
  };
  const onConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(e.target.value);
    setForm(addHeightsToForm(configs[e.target.value], form));
  };

  const toggleMapImageIsExpanded = () => {
    const expanded = !mapImageIsExpanded;
    setMapImageIsExpanded(expanded);
    console.log(sketchDims);
    console.log("toggling map image is expanded");
    const img = p5Ref.current?.firstElementChild;
    if (img instanceof HTMLImageElement) {
      if (expanded) {
        img.style.width = `${sketchDims.width}px`;
        img.style.height = `${sketchDims.height}px`;
        img.style.maxWidth = `${sketchDims.width}px`;
        img.style.maxHeight = `${sketchDims.height}px`;
        img.style.top = "0";
        img.style.left = "0";
        img.style.transform = "";
      } else {
        fitToParent(img, dimensions, sketchDims);
      }
    }
  };

  // Persist current config selection
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.CONFIG, config);
  }, [config]);

  // Persist form entries whenever they change
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.FORM, JSON.stringify(form));
  }, [form]);

  // Persist collisions whenever they change
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.COLLISIONS, JSON.stringify(collisions));
  }, [collisions]);

  // Persist default keep list flag whenever it changes
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(
      LS.IS_DEFAULT_KEEP_LIST_SET,
      JSON.stringify(isDefaultKeepListsSet)
    );
  }, [isDefaultKeepListsSet]);

  return (
    <div>
      {/* Header */}
      <Header />
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80"></div>
        <div className="w-80 fixed top-15 left-0 h-full overflow-y-auto border-r bg-white p-4 flex-shrink-0">
          <ConfigForm
            config={config}
            configs={configs}
            form={form}
            features={features}
            collisions={collisions}
            onConfigChange={onConfigChange}
            onFormChange={onFormChange}
            renderSketch={renderSketch({
              config: config!,
              form,
              bbox,
              selectedTrails,
              features,
            })}
            onSubmitSave={saveImage}
          />
        </div>
        {/* Main Content */}
        <div className="flex-1">
          <P5Canvas
            mapImageIsExpanded={mapImageIsExpanded}
            toggleMapImageIsExpanded={toggleMapImageIsExpanded}
            p5Ref={p5Ref}
            isLoading={isRendering}
          ></P5Canvas>
        </div>
        s
      </div>
    </div>
  );
};
