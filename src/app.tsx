import { useState, useRef, useEffect } from "react";
import { TourMap } from "./walkthrough";
import p5 from "p5";
import { sketchFactory } from "./map/sketch";

import { formElements } from "./components/configFormData";

import { useAuth } from "@clerk/clerk-react";
// Import configs with correct paths
import { snowMesaConfig, emeraldLakesConfig } from "./configs/index.ts";
import { MapConfig } from "./configs/schema.ts";
import { ConfigForm } from "./components/configForm.tsx";
import { P5Canvas } from "./components/p5Canvas.tsx";
import { getGeoJSONFromOSM, getFeatures } from "./map/trails.js";
import { tilesForFeatures } from "./map/processImage.js";
import { getImageUrlFromAws, maps, order, saveImageToAws } from "./api.ts";
import {
  fitToParent,
  getFormFromLocalStorage,
  LS,
  needsFilenamePrompt,
  normalizeFeatureName,
} from "./lib/utils";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router";
import { addHeightsToForm, convertToNestedObject } from "./lib/utils";
import _ from "lodash";
import { Header } from "./components/Header.tsx";
import { printTypes } from "./components/PrintOptions.tsx";

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

interface Configs {
  [key: string]: MapConfig;
}

const configs: Configs = {
  Original: snowMesaConfig,
  "Juniper Bark": emeraldLakesConfig,
};

export const App = () => {
  // get config id from url
  const [searchParams, setSearchParams] = useSearchParams();
  const configId = searchParams.get("configId");

  const [config, setConfig] = useState("Original");

  const { isSignedIn, user } = import.meta.env.DEV
    ? useUser()
    : { isSignedIn: false, user: null };

  const { getToken } = useAuth();

  const preForm = Object.entries(formElements).reduce(
    (obj, [key, [_, __, value]]) => {
      obj[key] = value;
      return obj;
    },
    {}
  );
  const [sketchDims, setSketchDims] = useState({ width: 0, height: 0 });
  const [form, setForm] = useState<Record<string, any>>(preForm);

  const [features, setFeatures] = useState<{ [key: string]: string[] }>({});
  const [bbox, setBbox] = useState<any>(null);
  const [selectedTrails, setSelectedTrails] = useState<string[]>([]);

  const [mapImageIsExpanded, setMapImageIsExpanded] = useState(false);

  const p5Ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [isInitialRun, setIsInitialRun] = useState(() => {
    const isInitialRun = JSON.parse(
      localStorage.getItem(LS.IS_DEFAULT_KEEP_LIST_SET) || "false"
    );
    return isInitialRun;
  });

  const [collisions, setCollisions] = useState<Record<string, string[]>>(() => {
    if (configId) {
      return {};
    }
    const saved = localStorage.getItem(LS.COLLISIONS);
    return saved ? JSON.parse(saved) : {};
  });

  const [toast, setToast] = useState<ToastState>(null);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      getToken().then((token) => {
        // getOrder(token).then((order) => {
        // setOrderId(order.id);
        // });
      });
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  // load config from db, or from local storage
  useEffect(() => {
    if (configId) {
      // get config from db
      maps.get(user?.id!, configId).then((config) => {
        console.log("retrieved config from database");
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
      const bbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
      const selectedTrails = JSON.parse(
        localStorage.getItem(LS.GEOJSON_SELECTED_TRAIL_SEGMENTS) || "[]"
      );
      const configName = localStorage.getItem(LS.CONFIG) || "Original";
      const form = getFormFromLocalStorage(preForm, configName, configs);
      const downstreamConfig = convertToNestedObject(form, configs[configName]);
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
      if (isInitialRun || nestedForm.forceCollisionDetection) {
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

      let mySelectedTrails = selectedTrails;
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
          sketchCollisions: Record<string, string[]>,
          sketchFeatures: Record<string, string[]>
        ) => {
          setSketchDims({ width: sketch.width, height: sketch.height });
          setForm((prev: any) => ({
            ...prev,
            "print.imageWidth": sketch.width,
            "print.imageHeight": sketch.height,
          }));
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
          if (isInitialRun || form.forceCollisionDetection) {
            setIsInitialRun(false);
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
            const features = _.mapValues(
              _.mapKeys(sketchFeatures, (value, key) => {
                return key.slice(0, -1);
              }),
              (value) => Object.keys(value)
            );
            setFeatures(features);
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
      // if (user && !isInitialRun) {
      //   console.log("saving map");
      //   maps
      //     .upsert(
      //       form,
      //       features,
      //       bbox,
      //       selectedTrails,
      //       user,
      //       config,
      //       configs[config]
      //     )
      //     .then(({ id }) => {
      //       setSearchParams((prev) => ({ ...prev, configId: id }));
      //     });
      // }

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

  const captureImage = () => {
    const container = p5Ref.current;
    if (!container) return;
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to capture image"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  };

  const handlePurchase = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      const blob = await captureImage();
      if (!blob) {
        console.error("Failed to capture image");
        return;
      }

      const { url, key } = await saveImageToAws(
        blob,
        form["filename"] as string
      );

      const imageUrl = await getImageUrlFromAws(key);
      console.log({ imageUrl });
    } catch (error) {
      console.error("Failed to purchase map", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUpload = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      const blob = await captureImage();
      if (!blob) {
        console.error("Failed to capture image");
        return;
      }

      const { url, key } = await saveImageToAws(
        blob,
        form["filename"] as string
      );
      const imageUrl = await getImageUrlFromAws(key);

      await maps.upsert({
        form,
        givenFeatures: features,
        bbox,
        selectedTrails,
        user,
        configName: config,
        defaultConfig: configs[config],
        imageUrl,
        s3Key: key,
      });
    } catch (error) {
      console.error("Failed to upload map", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleAddToOrder = async () => {
    if (isPurchasing) return;
    if (!isSignedIn) {
      setIsPurchasing(false);
      return;
    }
    setIsPurchasing(true);
    if (needsFilenamePrompt(form["filename"])) {
      // setIsFilenamePromptOpen(true);
      const filename = prompt(
        "Please enter a unique filename",
        form["filename"]
      );
      setForm({
        ...form,
        filename,
      });

      // setIsFilenamePromptOpen(false);
      // setIsPurchasing(false);
    }
    if (!form["print.size"] || !form["print.price"]) {
      setToast({ message: "Please select a print size", type: "error" });
      setIsPurchasing(false);
      return;
    }
    try {
      const blob = await captureImage();

      if (!blob) {
        console.error("Failed to capture image");
        return;
      }
      const { url, key } = await saveImageToAws(
        blob,
        form["filename"] as string
      );
      const imageUrl = await getImageUrlFromAws(key);

      const newMapConfig = await maps.upsert({
        form,
        givenFeatures: features,
        bbox,
        selectedTrails,
        user,
        configName: config,
        defaultConfig: configs[config],
        imageUrl,
        s3Key: key,
      });
      console.log({ newMapConfig });
      const mapConfigId = newMapConfig.id;
      if (!mapConfigId) {
        console.error("Failed to create map config");
        return;
      }
      const printType =
        printTypes[form["print.type"] as keyof typeof printTypes];
      console.log({
        quantity: form["print.quantity"],
        price: form["print.price"],
      });
      await order.addItem({
        orderId,
        orderItem: {
          mapConfigId,
          itemPrice: form["print.price"] || 0,
          userContribution: (form["print.contribution"] as number) || 0,
          subcategoryId: printType.subcategoryId,
          printType: form["print.type"] as string,
          width: form["print.size"]?.width,
          height: form["print.size"]?.height,
          options: printType.options.map((option) => option.optionId),
          quantity: form["print.quantity"] || 1,
          filename: form["filename"] as string,
        },
      });
      setToast({ message: "Map added to cart", type: "success" });
    } catch (error) {
      setToast({ message: "Failed to add to cart map", type: "error" });
      console.error("Failed to add to cart map", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const onFormChange = (arg1: any, arg2: any) => {
    // if arg1 is a string, do the normal thing
    console.log({ arg1, arg2 });
    if (typeof arg1 === "string") {
      const key = arg1 as string;
      const value = arg2;
      setForm({
        ...form,
        [key]: value,
      });
    } else if (typeof arg1 === "object") {
      setForm({
        ...form,
        ...arg1,
      });
    }
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
      JSON.stringify(isInitialRun)
    );
  }, [isInitialRun]);

  return (
    <div>
      {/* Header */}
      <Header />
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md px-4 py-3 shadow-lg text-white text-sm max-w-sm bg-opacity-90">
          <div
            className={
              "absolute inset-0 -z-10 rounded-md " +
              (toast.type === "error"
                ? "bg-red-600"
                : toast.type === "success"
                  ? "bg-green-600"
                  : "bg-gray-800")
            }
          />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto text-white/80 hover:text-white text-lg leading-none"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
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
            onPurchase={handlePurchase}
            onAddToOrder={handleAddToOrder}
            onUpload={handleUpload}
            isPurchasing={isPurchasing}
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
            sketchDims={sketchDims}
            printType={form["print.type"]}
            printSize={
              form["print.size"]
                ? (() => {
                    const m = String(form["print.size"]).match(
                      /^(\d+)[xX](\d+)$/
                    );
                    return m
                      ? { width: Number(m[1]), height: Number(m[2]) }
                      : null;
                  })()
                : null
            }
          ></P5Canvas>
        </div>
      </div>
    </div>
  );
};
