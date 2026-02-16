import React, { useEffect } from "react";
import type { AdvancedFormElementProps } from "./configFormData";
import _ from "lodash";
import { estimatePriceForPrintType } from "@/lib/lumaprintPrices";
import { getPrices } from "@/api";
import { Input } from "./ui/input";
import { formatMoney } from "@/lib/utils";

export const printTypes = {
  poster: {
    maximumHeight: 43.0,
    maximumWidth: 110.0,
    minimumHeight: 4.0,
    minimumWidth: 4.0,
    name: "Archival Matte Fine Art Paper",
    requiredDPI: 300,
    subcategoryId: 103001,
    options: [
      { optionId: 36, optionName: "0.25in Bleed (0.25in on each side)" },
    ],
    transform: (w: number, h: number) => {
      return {
        width: w - 0.5,
        height: h - 0.5,
      };
    },
  },

  framed: {
    subcategoryId: 105005,
    name: "1.25w x 0.875h Black Frame",
    minimumWidth: 5.0,
    maximumWidth: 60.0,
    minimumHeight: 5.0,
    maximumHeight: 40.0,
    requiredDPI: 300,
    options: [
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
    options: [
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
  subcategoryId,
  options,
}: {
  minimumWidth: number;
  minimumHeight: number;
  maximumWidth: number;
  maximumHeight: number;
  subcategoryId: string;
  options: { optionId: number; optionName: string }[];
}) => {
  const sizes = [];
  for (let width = minimumWidth; width <= maximumWidth; width += 1) {
    for (let height = minimumHeight; height <= maximumHeight; height += 1) {
      sizes.push({ width, height, subcategoryId, options });
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
  imgH: number,
) => {
  // if (!imgW || !imgH) (console.warn("Image dimensions not provided");
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

export const PrintOptions: React.FC<AdvancedFormElementProps> = ({
  form,
  onFormChange,
}) => {
  // const [sizes, setSizes] = React.useState<size[]>([]);
  const [loadingSizes, setLoadingSizes] = React.useState(false);
  // const [sizesError, setSizesError] = React.useState<string | null>(null);
  const [recommendedPrices, setRecommendedPrices] = React.useState<
    { price: number; height: number; width: number; options: any[] }[]
  >([]);
  const printTypeKey = (form["print.type"] ||
    "poster") as keyof typeof printTypes;
  const currentSize = form["print.size"];
  const imgW = form["print.imageWidth"] || 0;
  const imgH = form["print.imageHeight"] || 0;
  if (!imgW || !imgH) console.warn("Image dimensions not provided");

  const sizes = generateSizes(printTypes[printTypeKey]);
  const minDPI = 120;
  const scoredSizes = sizes
    .map(
      (s: {
        width: number;
        height: number;
        subcategoryId: string;
        options: { optionId: number; optionName: string }[];
      }) => {
        const t = printTypes[printTypeKey].transform;
        const transformedSize = t ? t(s.width, s.height) : null;
        return {
          ...s,
          transformedSize,
          options: s.options.map((o) => o.optionId),
          score: t
            ? getMatchScore(
                transformedSize.width,
                transformedSize.height,
                imgW,
                imgH,
              )
            : getMatchScore(s.width, s.height, imgW, imgH),
        };
      },
    )
    .sort((a, b) => b.score - a.score);

  const recommended = scoredSizes
    .filter(
      (s) =>
        s.score >= 0.975 && getDPI(imgW, imgH, s.width, s.height) >= minDPI,
    )
    // .slice(0, numSizes)
    .sort((a, b) => a.width - b.width || a.height - b.height);

  useEffect(() => {
    setLoadingSizes(true);
    getPrices(recommended).then((prices) => {
      setRecommendedPrices(prices);
      setLoadingSizes(false);
    });
  }, [form["print.type"], imgW, imgH]);

  const noRecSizes = recommended.length === 0;
  const noLegitDPI =
    scoredSizes.filter((s) => getDPI(imgW, imgH, s.width, s.height) >= minDPI)
      .length === 0;
  const noGoodScore = scoredSizes.filter((s) => s.score >= 0.975).length === 0;

  const handleTypeChange = (type: string) => {
    onFormChange("print.type", type);
  };

  const handleSizeSelect = (w: number, h: number, price: number) => {
    const t =
      printTypes[form["print.type"] as keyof typeof printTypes].transform;
    onFormChange(
      {
        "print.size": { width: w, height: h },
        "print.sizeActual": t ? t(w, h) : { width: w, height: h },
        "print.price": price,
      },
      null,
    );
    // onFormChange("print.price", price);
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
            ) : loadingSizes ? (
              "loading..."
            ) : (
              recommendedPrices.map((s) => {
                const isSelected =
                  currentSize?.width === s.width &&
                  currentSize?.height === s.height;
                // const matchPercent = Math.round(s.score * 100);
                const price = s.price;
                if (!price) return null;
                return (
                  <button
                    key={`${s.width}x${s.height}`}
                    type="button"
                    onClick={() => handleSizeSelect(s.width, s.height, price)}
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
                        {formatMoney(price)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <div>
        <h3>Quantity</h3>
        <Input
          type="number"
          min={1}
          value={form["print.quantity"]}
          onChange={(e) =>
            onFormChange("print.quantity", Number(e.target.value))
          }
        />
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-medium text-gray-900">
          Chip in, if you&apos;d like
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Right now, these prices come directly from my distributor, with no
          markup. This is as close as I can sustainably get to a pay-what-you
          want model, and it&apos;s my first step toward participating in a gift
          economy. If you&apos;d like to support me, you can add a contribution
          here.
        </p>
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-sm text-gray-700">$</span>
          <Input
            type="number"
            min={0}
            className="text-sm"
            onChange={
              (e) =>
                onFormChange(
                  "print.contribution",
                  Number(e.target.value) * 100 || 0,
                ) // convert to cents
            }
          />
        </div>
      </div>
    </div>
  );
};
