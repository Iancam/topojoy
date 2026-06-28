import { clearStoredGiftToken, GIFT_TOKEN_KEY } from "@/lib/giftToken";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";
import { Input } from "./ui/input";

export const GiftIndicatorBanner = ({
  availableAmountCents,
  setCurrentGiftToken,
  setAvailableAmountCents,
  setNetGiftAmountCents,
}: {
  availableAmountCents: number;
  setCurrentGiftToken: (token: string | null) => void;
  setAvailableAmountCents: (amount: number | null) => void;
  setNetGiftAmountCents: (amount: Record<string, number>) => void;
}) => {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState("");
  const handleApplyNewToken = () => {
    if (newTokenInput.trim()) {
      localStorage.setItem(GIFT_TOKEN_KEY, newTokenInput.trim());
      window.location.reload(); // Reload to apply new token
    }
  };
  const handleRemoveGift = () => {
    clearStoredGiftToken();
    setCurrentGiftToken(null);
    setAvailableAmountCents(null);
    setNetGiftAmountCents({});
    window.location.reload(); // Reload to recalculate prices
  };

  return (
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
          {/* <p className="text-xs text-teal-700">
            You have {formatMoney(availableAmountCents)} in gift credit
            available. Discounts are shown on print sizes below.
          </p> */}
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
  );
};
