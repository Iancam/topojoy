/**
 type prodigiRowAttribute = {
  value: any[];
};

type prodigiRow = {
  assets: any[];
  attributeDescription: string;
  brand: prodigiRowAttribute;
  description: string;
  edge: prodigiRowAttribute;
  finish: prodigiRowAttribute;
  frame: prodigiRowAttribute;
  frameColour: prodigiRowAttribute;
  fulfilledFrom: prodigiRowAttribute;
  gender: prodigiRowAttribute;
  glaze: prodigiRowAttribute;
  mount: prodigiRowAttribute;
  mountColour: prodigiRowAttribute;
  orientation: prodigiRowAttribute;
  paperType: prodigiRowAttribute;
  price: string;
  productType: string;
  size: prodigiRowAttribute;
  sku: string;
  sla: prodigiRowAttribute;
  style: prodigiRowAttribute;
  substrateWeight: prodigiRowAttribute;
  wrap: prodigiRowAttribute;
};
 */

const PRINT_TYPES = {
  poster: {
    id: "poster",
    slug: "enhanced-matte-art",
    label: "Rolled poster",
    filter: (row) => row.fulfilledFrom.value.includes("US"),
  },
  rolledCanvas: {
    id: "rolled-canvas",
    slug: "rolled-canvas",
    label: "Rolled canvas",
    filter: (row) =>
      row.fulfilledFrom.value.includes("US") &&
      row.paperType.value.includes("Standard canvas (sc)") &&
      row.glaze.value.includes("None"),
  },
  stretchedCanvas: {
    id: "stretched-canvas",
    slug: "stretched-canvas",
    label: "Stretched canvas",
    filter: (row) =>
      row.fulfilledFrom.value.includes("US") &&
      row.frame.value.includes("19mm standard stretcher bar") &&
      row.edge.value.includes("19mm") &&
      row.paperType.value.includes("Standard canvas (sc)") &&
      row.glaze.value.includes("None"),
  },
  framed: {
    id: "framed",
    slug: "classic-frames",
    label: "Framed print",
    filter: (row) =>
      row.fulfilledFrom.value.includes("US") &&
      row.paperType.value.includes("EMA"),
  },
};

// get sizes and prices for a given print type
const getPrintOptions = async (printTypeKey) => {
  const printType = PRINT_TYPES[printTypeKey];
  if (!printType) {
    throw new Error("Invalid print type");
  }
  const urlBase =
    "https://product-api-app-live.azurewebsites.net/api/catalogue/";
  const slug = printType.slug;
  const response = await fetch(`${urlBase}${slug}`, {
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch print options");
  }
  const data = await response.json();
  const options = data.variants.rows.filter(printType.filter);

  return options;
};

const options = await Promise.all(
  Object.entries(PRINT_TYPES).map(([k, v]) => {
    return getPrintOptions(k).then((options) => {
      return options.reduce((acc, option) => {
        if (acc[option.size.value]) {
          acc[option.size.value].push(option);
        } else {
          acc[option.size.value] = [option];
        }
        return acc;
      }, {});
    });
  })
);
console.log(options);
