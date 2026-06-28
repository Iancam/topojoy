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
import {
  getFeatureFlags,
  FEATURE_FLAGS,
  isFeatureEnabled,
} from "@/lib/featureFlags";
import { GiftIndicatorBanner } from "./GiftIndicatorBanner";
import { usePrintPrices } from "@/hooks/usePrintPrices";
import { SizeButton } from "./SizeButton";
import { getRecommendedSizes, printTypes } from "@/lib/printSIzeHelpers";

export const PrintOptions: React.FC<AdvancedFormElementProps> = ({
  form,
  onFormChange,
}) => {
  // const [sizes, setSizes] = React.useState<size[]>([]);

  // const [sizesError, setSizesError] = React.useState<string | null>(null);

  const [netGiftAmountCents, setNetGiftAmountCents] = React.useState<
    Record<string, number>
  >({});
  const [availableAmountCents, setAvailableAmountCents] = React.useState<
    number | null
  >(null);
  const [currentGiftToken, setCurrentGiftToken] = useState<string | null>(
    getStoredGiftToken(),
  );

  const [isChipInEnabled, setIsChipInEnabled] = useState(false);
  const [isPurchaseWithoutGiftEnabled, setPurchaseWithoutGiftEnabled] =
    useState(false);

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

  const { allRecommendedPrices, isLoadingPrices } = usePrintPrices({
    recommendedSizes,
    orderId: form["cart.orderId"],
    imgW,
    imgH,
    setNetGiftAmountCents,
    setAvailableAmountCents,
  });

  const recommendedPrices = allRecommendedPrices.filter((p) => {
    return p.subcategoryId === printTypes[printTypeKey].subcategoryId;
  });

  // Load feature flag
  useEffect(() => {
    async function checkFeatures() {
      const donationEnabled = await isFeatureEnabled(
        FEATURE_FLAGS.optionalDonationEnabled,
      );
      const purchaseWithoutGiftEnabled = await isFeatureEnabled(
        FEATURE_FLAGS.purchaseWithoutGiftEnabled,
      );
      setPurchaseWithoutGiftEnabled(purchaseWithoutGiftEnabled);
      setIsChipInEnabled(donationEnabled);
    }
    checkFeatures();
  }, []);

  const giftCreditCents =
    availableAmountCents !== null
      ? (netGiftAmountCents[String(printTypes[printTypeKey].subcategoryId)] ??
        availableAmountCents)
      : 0;

  const { noRecSizes, noLegitDPI, noGoodScore } =
    recommendedSizes[printTypeKey].error;

  const handleTypeChange = (type: string) => {
    onFormChange("print.type", type);
  };

  const effectivePrice = (rawPrice: number) =>
    Math.max(0, rawPrice - giftCreditCents);

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

  const [giftTokenInput, setGiftTokenInput] = React.useState("");

  const handleApplyGiftToken = () => {
    const token = giftTokenInput.trim();
    if (!token) return;
    localStorage.setItem(GIFT_TOKEN_KEY, token);
    setCurrentGiftToken(token);
    setGiftTokenInput("");
    window.location.reload();
  };
  console.log(isChipInEnabled);
  return (
    <div className="space-y-4">
      {/* Gift token entry — shown when no token is active */}
      {!currentGiftToken && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Have a gift token?
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={giftTokenInput}
              onChange={(e) => setGiftTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyGiftToken()}
              placeholder="Enter token"
              className="text-sm flex-1"
            />
            <button
              type="button"
              onClick={handleApplyGiftToken}
              disabled={!giftTokenInput.trim()}
              className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Gift Indicator Banner — shown when token is active */}
      {currentGiftToken && availableAmountCents !== null && (
        <GiftIndicatorBanner
          availableAmountCents={availableAmountCents}
          setCurrentGiftToken={setCurrentGiftToken}
          setAvailableAmountCents={setAvailableAmountCents}
          setNetGiftAmountCents={setNetGiftAmountCents}
        />
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
            ) : isLoadingPrices ? (
              "loading..."
            ) : (
              recommendedPrices.map(
                SizeButton({
                  effectivePrice,
                  onClick: handleSizeSelect,
                  currentSize,
                }),
              )
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
      {isChipInEnabled && !getStoredGiftToken() && (
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
