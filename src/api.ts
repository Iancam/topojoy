import { flow, mapValues } from "lodash";
import { MapConfig } from "./configs/schema";

/**
 * The app is small, and will likely remain small. A layer between
 * the client and the api would enable things that I wouldn't use,
 * and would cost more to maintain.
 */

export type MapConfigDTO = {
  userId: string;
  id?: string;
  filename?: string;
  title?: string;
  config: string;
  formJson: Record<string, any>;

  features: { selected: boolean; name: string; type: string }[];

  bbox: any;
  selectedTrails: any;

  annotations: any[];
  reflections: any[];
  createdAt?: string;
  updatedAt?: string;
  canEdit?: boolean;
  parentId?: string;
  giftAccessToken?: string | null;
  imageUrl?: string | null;
  s3Key?: string | null;
  AWSPutURL?: string;
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
      filename: string;
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
        credentials: "include", // Include cookies for Clerk authentication
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

type APIEntry = [
  string,
  string,
  string,
  ...((apiFn: (body: any) => Promise<any>) => (body: any) => Promise<any>)[],
];

const APIDataToAPIFN = ([
  urlPath,
  method,
  errorMessage,
  ...transformers
]: APIEntry) => {
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
  reflections,
  parentId,
  status,
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
  reflections?: { question?: string; answer?: string }[];
  parentId?: string;
  status?: string;
}) => {
  const {
    id: formId,
    s3Key: _s3KeyInForm,
    AWSPutURL,
    canEdit,
    createdAt,
    updatedAt,
    userId,
    parentId: _parentIdInForm,
    giftAccessToken,
    config,
    bbox: _bboxInForm,
    selectedTrails: _selectedTrailsInForm,
    features: _featuresInForm,
    ...formJson
  } = form;

  const featuresData = {
    lake: [form["lake.keepList"] || [], givenFeatures.lake || []],
    mountain: [form["mountain.keepList"] || [], givenFeatures.mountain || []],
    river: [form["river.keepList"] || [], givenFeatures.river || []],
    trail: [form["trail.keepList"] || [], givenFeatures.trail || []],
  };

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
    id: formId,
    userId: user?.id!,
    config: configName,
    formJson,
    features,
    annotations: form.annotations ?? [],
    bbox,
    selectedTrails,
    reflections: reflections ?? [],
    parentId,
    status,
    imageUrl,
    s3Key,
  };
};

const DTOToForm = (mapConfig: MapConfigDTO & { AWSPutURL?: string }) => {
  const data = mapConfig;
  const keepLists = ["lake", "mountain", "river", "trail"].reduce(
    (acc, type) => {
      const features = data.features || [];
      acc[`${type}.keepList`] = features
        .filter((f) => f.type === type && f.selected)
        .map((f) => f.name);
      return acc;
    },
    {} as { [key: string]: string[] },
  );

  const formJson: Record<string, any> = { ...(data.formJson || {}) };
  // JSON.stringify(Infinity) === null, so the top color plan band's height
  // (which is stored as Infinity) comes back from the DB/localStorage as
  // null. Restore it so colorAtFactory's `height === Infinity` check works.
  Object.keys(formJson).forEach((k) => {
    if (
      k.startsWith("colorPlan") &&
      k.endsWith("height") &&
      formJson[k] === null
    ) {
      formJson[k] = Infinity;
    }
  });

  return {
    ...formJson,
    ...keepLists,
    config: data.config,
    bbox: data.bbox,
    selectedTrails: data.selectedTrails,
    features: data.features,
    annotations: formJson.annotations ?? data.annotations ?? [],
    id: data.id,
    filename: data.filename,
    s3Key: data.s3Key,
    imageUrl: data.imageUrl,
    canEdit: data.canEdit,
    parentId: data.parentId,
    giftAccessToken: data.giftAccessToken,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    AWSPutURL: mapConfig.AWSPutURL,
  };
};

const mapsAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
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
        return json as MapListItem[];
      };
    },
  ],
  get: ["map-get", "GET", "Failed to load map", fromDTO(DTOToForm)],
  delete: ["map-delete", "POST", "Failed to delete map"],
});

const orderAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
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
  get: ["order-get", "GET", "Failed to get order"],
  list: ["order-list", "GET", "Failed to list orders"],
  retrySubmission: [
    "order-retry-submission",
    "POST",
    "Failed to retry order submission",
  ],
  // getLatest: ["order-latest", "GET", "Failed to get latest order"],
});

const adminAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
  mapsAll: ["admin-maps-all", "GET", "Failed to get all maps"],
  featureFlagsList: [
    "admin-feature-flags-list",
    "GET",
    "Failed to list feature flags",
  ],
  featureFlagsUpdate: [
    "admin-feature-flags-update",
    "POST",
    "Failed to update feature flag",
  ],
  donationsList: ["admin-donations-list", "GET", "Failed to list donations"],
  donationAllocationCreate: [
    "admin-donationAllocation-create",
    "POST",
    "Failed to create donation allocation",
  ],
  donationAllocationDelete: [
    "admin-donationAllocation-delete",
    "POST",
    "Failed to delete donation allocation",
  ],
  giftTokensList: [
    "admin-giftTokens-list",
    "GET",
    "Failed to list gift tokens",
  ],
  giftTokenCreate: [
    "admin-giftToken-create",
    "POST",
    "Failed to create gift token",
  ],
  giftTokenDelete: [
    "admin-giftToken-delete",
    "POST",
    "Failed to delete gift token",
  ],
  ordersList: ["admin-orders-list", "GET", "Failed to list orders"],
  orderRetrySubmission: [
    "admin-order-retry-submission",
    "POST",
    "Failed to retry order submission",
  ],
  notifyVariantsReady: [
    "admin-variants-notify",
    "POST",
    "Failed to notify submitter",
  ],
  setGiftToken: [
    "admin-map-set-gift-token",
    "POST",
    "Failed to set gift token",
  ],
});

const featureFlagsAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
  get: ["feature-flags-get", "GET", "Failed to get feature flags"],
});

const donationAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
  createPaymentIntent: [
    "donation-create-payment-intent",
    "POST",
    "Failed to create donation payment intent",
  ],
  getGiftValue: ["donation-gift-value", "POST", "Failed to get gift value"],
  getGift: ["donation-get-gift", "GET", "Failed to get gift"],
});

const giftedMapAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
  get: ["gifted-map-get", "GET", "Failed to get gifted map"],
  list: ["gifted-map-list", "GET", "Failed to list gifted maps"],
  updateReflection: [
    "gifted-map-update-reflection",
    "POST",
    "Failed to update reflection",
  ],
});

const submissionAPIData = (<T extends Record<string, APIEntry>>(x: T) => x)({
  create: ["map-submission-create", "POST", "Failed to submit map"],
  variantsList: ["map-variants-list", "GET", "Failed to load variants"],
  sendMessage: ["variant-message-send", "POST", "Failed to send message"],
});

export const maps = Object.fromEntries(
  Object.entries(mapsAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const order = Object.fromEntries(
  Object.entries(orderAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const admin = Object.fromEntries(
  Object.entries(adminAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const donation = Object.fromEntries(
  Object.entries(donationAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const featureFlags = Object.fromEntries(
  Object.entries(featureFlagsAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const giftedMap = Object.fromEntries(
  Object.entries(giftedMapAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);
export const submission = Object.fromEntries(
  Object.entries(submissionAPIData).map(([key, value]) => [
    key,
    APIDataToAPIFN(value),
  ]),
);

export const saveImageToAws = async (body: {
  blob: Blob;
  AWSPutURL: string;
}) => {
  const response = await fetch(body.AWSPutURL, {
    method: "PUT",
    body: body.blob,
  });

  if (!response.ok) throw new Error("Failed to save image");

  // return { url, key };
};

/**
 * Wraps any image URL through Netlify Image CDN for resizing + edge caching.
 * https://docs.netlify.com/image-cdn/overview/
 */
export const netlifyImageUrl = (
  sourceUrl: string,
  opts: { w?: number; h?: number; fit?: "cover" | "contain" | "fill" } = {},
): string => {
  const params = new URLSearchParams({ url: sourceUrl });
  if (opts.w) params.set("w", String(opts.w));
  if (opts.h) params.set("h", String(opts.h));
  if (opts.fit) params.set("fit", opts.fit);
  return `/.netlify/images?${params.toString()}`;
};

// use to send to lumaprints (returns raw signed URL, not CDN-wrapped)
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

// For display thumbnails — signed URL piped through Netlify Image CDN
export const getThumbnailUrl = async (
  key: string,
  width = 640,
): Promise<string> => {
  const signedUrl = await getImageUrlFromAws(key);
  return netlifyImageUrl(signedUrl, { w: width, fit: "cover" });
};

/********* Lumaprints API *********/

export const getPrices = async (
  products: {
    subcategoryId: number;
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
    subcategoryId: number;
    width: number;
    height: number;
    options: number[];
  }[];
};
