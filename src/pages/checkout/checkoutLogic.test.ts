import { describe, expect, it } from "@jest/globals";
import {
  getAmountOwedCents,
  getStepAfterGiftPaymentIntent,
  resolvePresetShippingIndex,
  getShippingSubmitButtonLabel,
  shouldUseGiftAutoFlow,
} from "./checkoutLogic";

describe("checkoutLogic", () => {
  describe("getAmountOwedCents", () => {
    it("returns null when gift total has not loaded", () => {
      expect(getAmountOwedCents(null)).toBeNull();
    });

    it("returns 0 when donation still has money left (positive balance)", () => {
      expect(getAmountOwedCents(500)).toBe(0);
    });

    it("returns 0 when donation exactly covers the order", () => {
      expect(getAmountOwedCents(0)).toBe(0);
    });

    it("returns absolute overage when donation balance is negative", () => {
      expect(getAmountOwedCents(-1234)).toBe(1234);
    });
  });

  describe("getShippingSubmitButtonLabel", () => {
    it("shows loading label while shipping options are being fetched", () => {
      expect(
        getShippingSubmitButtonLabel({
          submittingShipping: true,
          amountOwedCents: 0,
        }),
      ).toBe("Loading options…");
    });

    it("shows confirm label when amount owed is zero", () => {
      expect(
        getShippingSubmitButtonLabel({
          submittingShipping: false,
          amountOwedCents: 0,
        }),
      ).toBe("Confirm order");
    });

    it("shows continue label when amount owed is non-zero or unknown", () => {
      expect(
        getShippingSubmitButtonLabel({
          submittingShipping: false,
          amountOwedCents: 250,
        }),
      ).toBe("Continue to shipping method");

      expect(
        getShippingSubmitButtonLabel({
          submittingShipping: false,
          amountOwedCents: null,
        }),
      ).toBe("Continue to shipping method");
    });
  });

  describe("gift auto-flow shipping decisions", () => {
    it("uses gift auto-flow only when both gift token and preset shipping method exist", () => {
      expect(
        shouldUseGiftAutoFlow({
          giftToken: "token_123",
          giftShippingMethod: "ground",
        }),
      ).toBe(true);

      expect(
        shouldUseGiftAutoFlow({
          giftToken: "token_123",
          giftShippingMethod: null,
        }),
      ).toBe(false);

      expect(
        shouldUseGiftAutoFlow({
          giftToken: null,
          giftShippingMethod: "ground",
        }),
      ).toBe(false);
    });

    it("resolves preset shipping method index, falling back to first option", () => {
      const methods = [{ method: "ground" }, { method: "2_day" }];

      expect(resolvePresetShippingIndex(methods, "2_day")).toBe(1);
      expect(resolvePresetShippingIndex(methods, "overnight")).toBe(0);
      expect(resolvePresetShippingIndex([], "ground")).toBeNull();
    });

    it("routes to confirm when freeOrder is true, otherwise payment", () => {
      expect(getStepAfterGiftPaymentIntent(true)).toBe("confirm");
      expect(getStepAfterGiftPaymentIntent(false)).toBe("payment");
    });
  });
});
