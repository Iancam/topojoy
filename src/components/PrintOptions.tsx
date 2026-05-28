import React, { useEffect, useState } from "react";
import type { AdvancedFormElementProps } from "./configFormData";
import _ from "lodash";
import { estimatePriceForPrintType } from "@/lib/lumaprintPrices";
import { donation, getPrices } from "@/api";
import { Input } from "./ui/input";
import { formatMoney } from "@/lib/utils";
import {
  getStoredGiftToken,
  clearStoredGiftToken,
  GIFT_TOKEN_KEY,
} from "@/lib/giftToken";
import { getFeatureFlags, FEATURE_FLAGS } from "@/lib/featureFlags";

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
      { optionId: 259, optionName: "Matte" },
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
  subcategoryId: number;
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

const getRecommendedSizes = (
  printTypeKey: keyof typeof printTypes,
  imgW: number,
  imgH: number,
) => {
  const sizes = generateSizes(printTypes[printTypeKey]);
  const minDPI = 120;
  const scoredSizes = sizes
    .map(
      (s: {
        width: number;
        height: number;
        subcategoryId: number;
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

  const noRecSizes = recommended.length === 0;
  const noLegitDPI =
    scoredSizes.filter((s) => getDPI(imgW, imgH, s.width, s.height) >= minDPI)
      .length === 0;
  const noGoodScore = scoredSizes.filter((s) => s.score >= 0.975).length === 0;

  return { recommended, error: { noRecSizes, noLegitDPI, noGoodScore } };
};

export const PrintOptions: React.FC<AdvancedFormElementProps> = ({
  form,
  onFormChange,
}) => {
  // const [sizes, setSizes] = React.useState<size[]>([]);
  const [loadingSizes, setLoadingSizes] = React.useState(false);
  // const [sizesError, setSizesError] = React.useState<string | null>(null);
  const [allRecommendedPrices, setAllRecommendedPrices] = React.useState<
    {
      price: number;
      height: number;
      width: number;
      options: any[];
      subcategoryId: number;
    }[]
  >([]);
  const [netGiftAmountCents, setNetGiftAmountCents] = React.useState<
    Record<string, number>
  >({});
  const [availableAmountCents, setAvailableAmountCents] = React.useState<
    number | null
  >(null);
  const [currentGiftToken, setCurrentGiftToken] = useState<string | null>(
    getStoredGiftToken(),
  );
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState("");
  const [isDonationEnabled, setIsDonationEnabled] = useState(false);
  // const [giftBannerMsg, setGiftBannerMsg] = React.useState<string | null>(null);
  const printTypeKey = (form["print.type"] ||
    "poster") as keyof typeof printTypes;
  const currentSize = form["print.size"];
  const imgW = form["print.imageWidth"] || 0;
  const imgH = form["print.imageHeight"] || 0;

  const recommendedSizes = Object.fromEntries(
    Object.keys(printTypes).map((k) => [
      k,
      getRecommendedSizes(k as keyof typeof printTypes, imgW, imgH),
    ]),
  );
  const recommendedPrices = allRecommendedPrices.filter((p) => {
    return p.subcategoryId === printTypes[printTypeKey].subcategoryId;
  });

  // Load feature flag
  useEffect(() => {
    getFeatureFlags().then((flags) => {
      setIsDonationEnabled(
        flags[FEATURE_FLAGS.optionalDonationEnabled] ?? false,
      );
    });
  }, []);

  useEffect(() => {
    setLoadingSizes(true);
    const token = getStoredGiftToken();

    const allRecommendedSizes = Object.values(recommendedSizes)
      .map((v) => v.recommended)
      .flat();
    if (allRecommendedSizes.length < 1) return;
    getPrices(allRecommendedSizes).then((prices) => {
      setAllRecommendedPrices(prices);
      if (!token) setLoadingSizes(false);
    });

    if (!token) return;
    const biggestItemPerType = Object.values(recommendedSizes).map((r) => ({
      ...r.recommended[r.recommended.length - 1],
      quantity: 1,
    }));
    const orderId = form["cart.orderId"] || undefined;
    donation
      .getGiftValue({ accessToken: token, items: biggestItemPerType, orderId })
      .then((data: any) => {
        const giftMap = Object.fromEntries(
          data.items.map(({ subcategoryId, adjustedAmountAvailable }: any) => [
            subcategoryId,
            adjustedAmountAvailable,
          ]),
        );
        setNetGiftAmountCents(giftMap);
        setAvailableAmountCents(data.availableAmountCents);
        setLoadingSizes(false);
      })
      .catch(() => {});
    // apply gift if available
  }, [imgW, imgH]);

  const giftCreditCents =
    availableAmountCents !== null
      ? (netGiftAmountCents[String(printTypes[printTypeKey].subcategoryId)] ??
        availableAmountCents)
      : 0;

  const effectivePrice = (rawPrice: number) =>
    Math.max(0, rawPrice - giftCreditCents);

  const { noRecSizes, noLegitDPI, noGoodScore } =
    recommendedSizes[printTypeKey].error;

  const handleTypeChange = (type: string) => {
    onFormChange("print.type", type);
  };

  const handleSizeSelect = (w: number, h: number, rawPrice: number) => {
    const t =
      printTypes[form["print.type"] as keyof typeof printTypes].transform;
    onFormChange(
      {
        "print.size": { width: w, height: h },
        "print.sizeActual": t ? t(w, h) : { width: w, height: h },
        "print.price": rawPrice,
      },
      null,
    );
  };

  const handleRemoveGift = () => {
    clearStoredGiftToken();
    setCurrentGiftToken(null);
    setAvailableAmountCents(null);
    setNetGiftAmountCents({});
    window.location.reload(); // Reload to recalculate prices
  };

  const handleApplyNewToken = () => {
    if (newTokenInput.trim()) {
      localStorage.setItem(GIFT_TOKEN_KEY, newTokenInput.trim());
      window.location.reload(); // Reload to apply new token
    }
  };

  return (
    <div className="space-y-4">
      {/* Gift Indicator Banner */}
      {currentGiftToken && availableAmountCents !== null && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-5 h-5 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
                <h4 className="text-sm font-semibold text-teal-900">
                  Gift Credit Applied
                </h4>
              </div>
              <p className="text-xs text-teal-700">
                You have {formatMoney(availableAmountCents)} in gift credit
                available. Discounts are shown on print sizes below.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="text-xs px-2 py-1 rounded border border-teal-300 bg-white text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemoveGift}
                className="text-xs px-2 py-1 rounded border border-teal-300 bg-white text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
          {showTokenInput && (
            <div className="mt-3 pt-3 border-t border-teal-200">
              <label className="text-xs text-teal-700 block mb-1">
                Enter new gift token:
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder="Enter gift token"
                  className="text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={handleApplyNewToken}
                  className="text-xs px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
                const rawPrice = s.price;
                if (!rawPrice) return null;
                const discounted = effectivePrice(rawPrice);
                return (
                  <button
                    key={`${s.width}x${s.height}`}
                    type="button"
                    onClick={() =>
                      handleSizeSelect(s.width, s.height, rawPrice)
                    }
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
                      <span className="text-[10px] ml-1 flex items-center gap-1">
                        {discounted < rawPrice && (
                          <span className="line-through text-gray-400">
                            {formatMoney(rawPrice)}
                          </span>
                        )}
                        <span
                          className={
                            discounted < rawPrice
                              ? "text-teal-600 font-semibold"
                              : "text-gray-500"
                          }
                        >
                          {formatMoney(discounted)}
                        </span>
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
      {isDonationEnabled && !getStoredGiftToken() && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            Chip in, if you&apos;d like
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Right now, these prices come directly from my distributor, with no
            markup. This is as close as I can sustainably get to a pay-what-you
            want model, and it&apos;s my first step toward participating in a
            gift economy. If you&apos;d like to support me, you can add a
            contribution here.
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
      )}
    </div>
  );
};
