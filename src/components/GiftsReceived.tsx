import React, { useState, useEffect } from "react";
import { getStoredGiftToken, clearStoredGiftToken } from "../lib/giftToken";
import { donation } from "../api";
import { formatMoney } from "../lib/utils";
import { Input } from "./ui/input";

export const GiftsReceived: React.FC = () => {
  const [currentToken, setCurrentToken] = useState<string | null>(
    getStoredGiftToken(),
  );
  const [giftInfo, setGiftInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTokenInput, setNewTokenInput] = useState("");

  useEffect(() => {
    if (currentToken) {
      loadGiftInfo(currentToken);
    }
  }, [currentToken]);

  const loadGiftInfo = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await donation.getGift({ accessToken: token });
      setGiftInfo(data);
    } catch (err: any) {
      setError(err.message || "Failed to load gift information");
      setGiftInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToken = () => {
    if (newTokenInput.trim()) {
      localStorage.setItem("topojoy_gift_token", newTokenInput.trim());
      setCurrentToken(newTokenInput.trim());
      setNewTokenInput("");
    }
  };

  const handleRemoveToken = () => {
    clearStoredGiftToken();
    setCurrentToken(null);
    setGiftInfo(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Gifts Received</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage your gift tokens and view available credit
        </p>
      </div>

      {/* Add/Change Token Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">
          {currentToken ? "Change Gift Token" : "Add Gift Token"}
        </h3>
        <div className="flex gap-2">
          <Input
            type="text"
            value={newTokenInput}
            onChange={(e) => setNewTokenInput(e.target.value)}
            placeholder="Enter gift token"
            className="flex-1"
          />
          <button
            onClick={handleApplyToken}
            disabled={!newTokenInput.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Current Token Status */}
      {currentToken && (
        <div
          className={`border rounded-lg p-4 ${
            error ? "border-red-200 bg-red-50" : "border-teal-200 bg-teal-50"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {error ? (
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
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
              )}
              <h4
                className={`text-sm font-semibold ${
                  error ? "text-red-900" : "text-teal-900"
                }`}
              >
                {error ? "Invalid Gift Token" : "Active Gift Token"}
              </h4>
            </div>
            <button
              onClick={handleRemoveToken}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                error
                  ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
                  : "border-teal-300 bg-white text-teal-700 hover:bg-teal-50"
              }`}
            >
              Remove
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600">Loading gift information...</p>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-xs text-red-600">
                This gift token may have expired, been fully redeemed, or
                doesn't exist. Please remove it and try a different token.
              </p>
            </div>
          ) : giftInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-teal-700">
                  Total Gift Amount:
                </span>
                <span className="text-sm font-semibold text-teal-900">
                  {formatMoney(giftInfo.amount)}
                </span>
              </div>
              {giftInfo.expiryDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-teal-700">Expires:</span>
                  <span className="text-sm text-teal-900">
                    {new Date(giftInfo.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-teal-200">
                <p className="text-xs text-teal-600">
                  This gift credit will be automatically applied to your next
                  print order.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!currentToken && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            No gift token currently active. Enter a gift token above to apply
            credit to your account.
          </p>
        </div>
      )}
    </div>
  );
};
