import { describe, expect, it } from "@jest/globals";
import {
  getAmountOwedCents,
  getShippingSubmitButtonLabel,
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
});
