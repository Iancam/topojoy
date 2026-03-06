import { flow, mapValues } from "lodash";
import { MapConfig } from "./configs/schema";
import { convertToNestedObject } from "./lib/utils";

export type MapConfigDTO = {
  userId: string;
  id?: string;
  filename?: string;
  title: string;
  config: string;
  zoomLevel: number;
  curveDensity: number;

  features: { selected: boolean; name: string; type: string }[];

  bbox: any;
  selectedTrails: any;

  backgroundText: string;
  backgroundTextElevationRange0: number;
  backgroundTextElevationRange1: number;
  backgroundTextHighContrast: boolean;

  crossHatch: boolean;
  colorPlan: string;
  annotations?: {
    id?: string;
    text: string;
    fontSize: number;
    color: string;
    xRatio: number;
    yRatio: number;
  }[];
};

export type CartOrder = {
  id: string;
  status: string;
  totalPrice: number;
  orderItems: {
    id: string;
    mapConfigId: string | null;
    mapConfig: {
      s3Key: string | null;
    } | null;
    filename: string;
    imageUrl: string;
    printType: string;
    subcategoryId?: number | string;
    width: number;
    height: number;
    quantity: number;
    itemPrice: number; // cents
    userContribution: number; // cents
    totalPrice: number; // cents
    orderItemOptions?: number[];
  }[];
};

export type MapListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
};

// the netlify functions always return json, even if it's an error
// to get the error message, we can parse the response

const apiCall = (urlPath: string, method: string, errorMessage: string) => {
  return async (body: any) => {
    const searchParams = new URLSearchParams();
    if (method === "GET") {
      // Append key-value pairs, which automatically handles encoding
      Object.keys(body || {}).forEach((key) => {
        searchParams.append(key, body[key]);
      });
    }
    const res = await fetch(
      `/.netlify/functions/${urlPath}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body:
          method === "GET" || method === "HEAD"
            ? undefined
            : JSON.stringify(body),
      },
    );
    const json = await res.json();
    const errorMessageFinal = `${errorMessage}\nServer message: ${json.message}`;
    if (!res.ok) {
      console.error(errorMessageFinal);
      throw new Error(errorMessageFinal);
    }
    return json;
  };
};

/**
 * The app is small, and will likely remain small. A layer between
 * the client and the api would enable things that I wouldn't use,
 * and would cost more to maintain.
 */

const toDTO =
  (toDTO: (body: any) => any) => (apiCallFn: (body: any) => Promise<any>) => {
    return async (body: any) => {
      const json = await apiCallFn(toDTO(body));
      return json;
    };
  };

const fromDTO =
  (toClientDomainObject: (body: any) => any) =>
  (apiCallFn: (body: any) => Promise<any>) => {
    return async (body: any) => {
      const json = await apiCallFn(body);
      return toClientDomainObject(json);
    };
  };

const APIDataToAPIFN = ([urlPath, method, errorMessage, ...transformers]: [
  string,
  string,
  string,
  ...((apiFn: (body: any) => Promise<any>) => (body: any) => Promise<any>)[],
]) => {
  const base = apiCall(urlPath, method, errorMessage);
  if (transformers.length === 0) {
    return base;
  }
  return flow(...transformers)(base);
};

const formToDTO = ({
  form,
  givenFeatures,
  bbox,
  selectedTrails,
  user,
  configName,
  defaultConfig,
  imageUrl,
  s3Key,
}: {
  form: any;
  givenFeatures: Record<string, string[]>;
  bbox: any;
  selectedTrails: any;
  user: any;
  configName: string;
  defaultConfig: MapConfig;
  imageUrl: string | undefined;
  s3Key: string | undefined;
}) => {
  const nestedForm = convertToNestedObject(form, defaultConfig);
  const featuresData = {
    lake: [form["lake.keepList"] || [], givenFeatures.lake || []],
    mountain: [form["mountain.keepList"] || [], givenFeatures.mountain || []],
    river: [form["river.keepList"] || [], givenFeatures.river || []],
    trail: [form["trail.keepList"] || [], givenFeatures.trail || []],
  };
  // create a list of all features, with their selected state, name, and type
  const features = Object.entries(featuresData).flatMap(
    ([key, [keepList, list]]) => {
      return list.map((name: string) => ({
        selected: keepList.includes(name),
        name,
        type: key,
      }));
    },
  );

  return {
    id: form.id,
    userId: user?.id!,
    title: nestedForm.title.text,
    config: configName,
    zoomLevel: nestedForm.zoomLevel,
    curveDensity: nestedForm.curve.density,
    filename: nestedForm.filename,
    bbox: bbox,
    selectedTrails,
    features,
    backgroundText: nestedForm.backgroundText.text,
    backgroundTextElevationRange0: nestedForm.backgroundText.elevationRange[0],
    backgroundTextElevationRange1: nestedForm.backgroundText.elevationRange[1],
    backgroundTextHighContrast: nestedForm.backgroundText.highContrast,
    crossHatch: nestedForm.crossHatch,
    colorPlan: nestedForm.colorPlan
      .map((c: { height: number }) => c.height)
      .join(","),
    imageUrl,
    s3Key,
    annotations: (form.annotations ?? []).map(
      (ann: {
        id?: string;
        text: string;
        fontSize: number;
        color: string;
        xRatio: number;
        yRatio: number;
      }) => ({
        text: ann.text,
        fontSize: ann.fontSize,
        color: ann.color,
        xRatio: ann.xRatio,
        yRatio: ann.yRatio,
      }),
    ),
  };
};

const DTOToForm = (data: MapConfigDTO) => {
  const keeplists = ["lake", "mountain", "river", "trail"].reduce(
    (acc, type) => {
      const features = data.features || [];
      acc[`${type}.keepList`] = features
        .filter((f) => f.type === type && f.selected)
        .map((f) => f.name);
      return acc;
    },
    {} as { [key: string]: string[] },
  );

  const ret = {
    ...data.colorPlan
      .split(",")
      .map((c: string, i: number) => ({
        key: `colorPlan.${i}.height`,
        value: Number(c),
      }))
      .reduce(
        (
          obj: { [key: string]: number },
          { key, value }: { key: string; value: number },
        ) => {
          obj[key] = value;
          return obj;
        },
        {},
      ),

    "backgroundText.text": data.backgroundText,
    "backgroundText.elevationRange": [
      data.backgroundTextElevationRange0 as number,
      data.backgroundTextElevationRange1 as number,
    ],
    "backgroundText.highContrast": data.backgroundTextHighContrast as boolean,
    crossHatch: data.crossHatch as boolean,
    "curve.density": data.curveDensity as number,
    "title.text": data.title as string,
    ...keeplists,
    // hand translate data fields to avoid polluting the form
    zoomLevel: data.zoomLevel as number,
    bbox: data.bbox,
    selectedTrails: data.selectedTrails,
    features: data.features,
    config: data.config,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    userId: data.userId,
    id: data.id,
    filename: data.filename,
    annotations: data.annotations ?? [],
  };

  return ret;
};

const mapsAPIData = {
  upsert: [
    "map-upsert",
    "POST",
    "Failed to save map",
    toDTO(formToDTO),
    fromDTO(DTOToForm),
  ],
  all: [
    "map-all",
    "GET",
    "Failed to load maps",
    (fn: (body: any) => Promise<any>) => {
      return async (body: any) => {
        const json = await fn(body);
        console.log(json);
        return json as MapListItem[];
      };
    },
  ],
  get: ["map-get", "GET", "Failed to load map", fromDTO(DTOToForm)],
  delete: ["map-delete", "POST", "Failed to delete map"],
};

const orderAPIData = {
  addItem: ["order-add-item", "POST", "Failed to add item to order"],
  getCart: ["order-get-cart", "GET", "Failed to get cart"],
  update: ["order-update", "POST", "Failed to update"],
  updateItem: ["order-update-item", "POST", "Failed to update item"],
  removeItem: ["order-remove-item", "POST", "Failed to remove cart item"],
  getShippingOptions: [
    "print-shipping-post",
    "POST",
    "Failed to get shipping options",
  ],
  createPaymentIntent: [
    "stripe-create-payment-intent",
    "POST",
    "Failed to create payment intent",
  ],
  // submitToLumaprints: [
  //   "print-submit-order",
  //   "POST",
  //   "Failed to submit order to Lumaprints",
  // ],
  getLatest: ["order-latest", "GET", "Failed to get latest order"],
};

const adminAPIData = {
  mapsAll: ["admin-maps-all", "GET", "Failed to get all maps"],
};

type createPaymentIntentBody = {
  amount: number;
  currency: string;
  paymentMethodId: string;
};

export const maps = mapValues(mapsAPIData, APIDataToAPIFN);
export const order = mapValues(orderAPIData, APIDataToAPIFN);
export const admin = mapValues(adminAPIData, APIDataToAPIFN);

export const saveImageToAws = async (body: {
  blob: Blob;
  filename: string;
  mapConfigId: string;
}) => {
  const res = await fetch("/.netlify/functions/print-put-signed-url", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Failed to save image");

  const { url, key } = await res.json();

  const response = await fetch(url, {
    method: "PUT",
    body: body.blob,
  });

  if (!response.ok) throw new Error("Failed to save image");

  return { url, key };
};

// use to send to lumaprints
export const getImageUrlFromAws = async (key: string) => {
  const res = await fetch("/.netlify/functions/print-get-signed-url", {
    method: "POST",
    body: JSON.stringify({
      filename: key,
    }),
  });

  if (!res.ok) throw new Error("Failed to get image");

  const { url } = await res.json();

  return url;
};

/********* Lumaprints API *********/

export const getPrices = async (
  products: {
    subcategoryId: string;
    width: number;
    height: number;
    options: Number[];
  }[],
) => {
  const res = await fetch("/.netlify/functions/print-price-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "force-cache",
    body: JSON.stringify({
      products,
    }),
  });
  if (!res.ok) throw new Error("Failed to get prices");
  const json = await res.json();
  // if (!json.success) throw new Error(json.message || "Failed to get prices");
  return json as {
    price: number;
    subcategoryId: string;
    width: number;
    height: number;
    options: number[];
  }[];
};
