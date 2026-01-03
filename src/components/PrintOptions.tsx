import React from "react";
import type { AdvancedFormElementProps } from "./configFormData";
import _ from "lodash";
import { estimatePriceForPrintType } from "@/lib/lumaprintPrices";

const printTypes = {
  poster: {
    maximumHeight: 43.0,
    maximumWidth: 110.0,
    minimumHeight: 4.0,
    minimumWidth: 4.0,
    name: "Archival Matte Fine Art Paper",
    requiredDPI: 300,
    subcategoryId: 103001,
    selectedOptions: [
      { optionId: 36, optionName: "0.25in Bleed (0.25in on each side)" },
    ],
  },

  framed: {
    subcategoryId: 105005,
    name: "1.25w x 0.875h Black Frame",
    minimumWidth: 5.0,
    maximumWidth: 60.0,
    minimumHeight: 5.0,
    maximumHeight: 40.0,
    requiredDPI: 300,
    selectedOptions: [
      { optionId: 64, optionName: "No Mat" },
      { optionId: 74, optionName: "Archival Matte Fine Art Paper" },
      { optionId: 83, optionName: "Hanging Wire installed on frame" },
      { optionId: 94, optionName: "No Backing" },
      { optionId: 96, optionName: "White" },
      { optionId: 146, optionName: "Acrylic Glass (recommended)" },
      { optionId: 149, optionName: "Loose Mounted" },
    ],
  },

  canvas: {
    subcategoryId: 101002,
    name: "1.25in Stretched Canvas",
    minimumWidth: 6.0,
    maximumWidth: 110.0,
    minimumHeight: 6.0,
    maximumHeight: 52.0,
    requiredDPI: 200,
    selectedOptions: [
      { optionId: 2, optionName: "Mirror Wrap" },
      { optionId: 11, optionName: "Sawtooth Hanger installed" },
      { optionId: 224, optionName: "Matte" },
    ],
  },
};

const generateSizes = ({
  minimumWidth,
  minimumHeight,
  maximumWidth,
  maximumHeight,
}: {
  minimumWidth: number;
  minimumHeight: number;
  maximumWidth: number;
  maximumHeight: number;
}) => {
  const sizes = [];
  for (let width = minimumWidth; width <= maximumWidth; width += 1) {
    for (let height = minimumHeight; height <= maximumHeight; height += 1) {
      sizes.push({ width, height });
      // if (width !== height) {
      //   sizes.push({ width: height, height: width });
      // }
    }
  }
  return _.uniqBy(sizes, (s) => `${s.width}x${s.height}`);
};

type size = { width: number; height: number };

const getMatchScore = (
  printW: number,
  printH: number,
  imgW: number,
  imgH: number
) => {
  const printRatio = printW / printH;
  const imageRatio = imgW / imgH;
  const diff = Math.abs(printRatio - imageRatio);
  return 1 - Math.min(diff, 1);
};

const getDPI = (imgW: number, imgH: number, printW: number, printH: number) => {
  if (!printW || !printH) return 0;
  const dpiX = imgW / printW;
  const dpiY = imgH / printH;
  return Math.min(dpiX, dpiY);
};

const selectSpanningSizes = (
  sizes: (size & { score: number })[],
  maxCount: number
) => {
  if (sizes.length <= maxCount) {
    return _.sortBy(sizes, ["width", "height"]);
  }

  const sorted = _.sortBy(sizes, ["width", "height"]);
  const result: (size & { score: number })[] = [];
  const slots = maxCount;
  const lastIndex = sorted.length - 1;

  for (let i = 0; i < slots; i += 1) {
    const t = slots === 1 ? 0 : i / (slots - 1);
    const idx = Math.round(t * lastIndex);
    const picked = sorted[idx];
    if (
      !result.find(
        (r) => r.width === picked.width && r.height === picked.height
      )
    ) {
      result.push(picked);
    }
  }

  return _.sortBy(result, ["width", "height"]);
};

export const PrintOptions: React.FC<AdvancedFormElementProps> = ({
  form,
  onFormChange,
}) => {
  // const [sizes, setSizes] = React.useState<size[]>([]);
  // const [loadingSizes, setLoadingSizes] = React.useState(false);
  // const [sizesError, setSizesError] = React.useState<string | null>(null);

  const printTypeKey = (form["print.type"] ||
    "poster") as keyof typeof printTypes;
  const currentSize = form["print.size"];
  const imgW = form["print.imageWidth"] || form["sketch.width"] || 0;
  const imgH = form["print.imageHeight"] || form["sketch.height"] || 0;
  let recommended = [];
  const sizes = generateSizes(printTypes[printTypeKey]);
  const scoredSizes = sizes
    .map((s: { width: number; height: number }) => ({
      ...s,
      score: getMatchScore(s.width, s.height, imgW, imgH),
    }))
    .sort((a, b) => b.score - a.score);

  const numSizes = 24;
  const minDPI = 150;
  recommended = scoredSizes
    .filter(
      (s) => s.score >= 0.975 && getDPI(imgW, imgH, s.width, s.height) >= minDPI
    )
    // .slice(0, numSizes)
    .sort((a, b) => a.width - b.width || a.height - b.height);

  const noRecSizes = recommended.length === 0;
  const noLegitDPI =
    scoredSizes.filter((s) => getDPI(imgW, imgH, s.width, s.height) >= minDPI)
      .length === 0;
  const noGoodScore = scoredSizes.filter((s) => s.score >= 0.975).length === 0;

  const handleTypeChange = (type: string) => {
    onFormChange("print.type", type);
  };

  const handleSizeSelect = (w: number, h: number) => {
    onFormChange("print.size", { width: w, height: h });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Print Type</h3>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(printTypes).map(([k, t]) => (
            <button
              key={t.subcategoryId}
              type="button"
              onClick={() => handleTypeChange(k)}
              className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                printTypeKey === k
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Print Size</h3>
        {!imgW || !imgH ? (
          <p className="text-xs text-gray-500">
            Render a map first to see recommended sizes based on the image.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {noRecSizes ? (
              <p className="text-xs text-gray-500">
                No recommended sizes found.
                {noLegitDPI ? " DPI too low" : ""}
                {noGoodScore ? " Aspect ratio match too low" : ""}
              </p>
            ) : (
              recommended.map((s) => {
                const isSelected =
                  currentSize?.width === s.width &&
                  currentSize?.height === s.height;
                const matchPercent = Math.round(s.score * 100);
                const price = estimatePriceForPrintType(printTypeKey, s);
                if (!price) return null;
                return (
                  <button
                    key={`${s.width}x${s.height}`}
                    type="button"
                    onClick={() => handleSizeSelect(s.width, s.height)}
                    className={`text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        {s.width}" × {s.height}"
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">
                        ${price.estimatedPrice}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
