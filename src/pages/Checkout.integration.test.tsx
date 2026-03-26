/** @jest-environment jsdom */
import React from "react";
import { MemoryRouter } from "react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Checkout } from "./Checkout";

const mockRefresh = jest.fn<() => Promise<any>>();
const mockGetStoredGiftToken = jest.fn<() => string | null>();

jest.mock("../api", () => ({
  order: {
    update: jest.fn<() => Promise<any>>(),
    getShippingOptions: jest.fn<() => Promise<any>>(),
    createPaymentIntent: jest.fn<() => Promise<any>>(),
    get: jest.fn<() => Promise<any>>(),
  },
  donation: {
    getGiftValue: jest.fn<() => Promise<any>>(),
  },
  getImageUrlFromAws: jest.fn(),
}));

const { order: mockOrder, donation: mockDonation } = jest.requireMock(
  "../api",
) as {
  order: {
    update: jest.Mock;
    getShippingOptions: jest.Mock;
    createPaymentIntent: jest.Mock;
    get: jest.Mock;
  };
  donation: {
    getGiftValue: jest.Mock;
  };
};

jest.mock("../cartContext", () => ({
  useCartContext: () => ({
    cart: {
      id: "order_123",
      totalPrice: 2500,
      orderItems: [
        {
          id: "item_1",
          filename: "Map A",
          printType: "poster",
          width: 8,
          height: 10,
          quantity: 1,
          totalPrice: 2500,
          itemPrice: 2500,
          subcategoryId: 1,
          orderItemOptions: [],
          mapConfig: { s3Key: "key_1" },
        },
      ],
    },
    loading: false,
    error: null,
    refresh: mockRefresh,
  }),
}));

jest.mock("../components/Header", () => ({
  Header: () => null,
}));

jest.mock("../components/MapThumbnail", () => ({
  MapThumbnail: () => null,
}));

jest.mock("../components/StripePaymentForm", () => ({
  StripePaymentForm: () => <div>Stripe Payment Form</div>,
}));

jest.mock("../lib/giftToken", () => ({
  getStoredGiftToken: () => mockGetStoredGiftToken(),
}));

jest.mock("../lib/env", () => ({
  getStripePublishableKey: () => "pk_test_123",
}));

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div>Payment Element</div>,
  useElements: () => null,
  useStripe: () => null,
}));

const setupCheckout = () => {
  const ui = render(
    <MemoryRouter initialEntries={["/checkout?step=shipping"]}>
      <Checkout />
    </MemoryRouter>,
  );
  return { ...ui, user: userEvent.setup() };
};

const fillShippingForm = async (
  container: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) => {
  const byName = (name: string) =>
    container.querySelector(`[name="${name}"]`) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;

  const email = byName("email");
  const name = byName("name");
  const line1 = byName("line1");
  const city = byName("city");
  const state = byName("state");
  const postal = byName("postalCode");

  if (!email || !name || !line1 || !city || !state || !postal) {
    throw new Error("Missing required shipping form inputs");
  }

  await user.type(email, "test@example.com");
  await user.type(name, "Test User");
  await user.type(line1, "123 Main St");
  await user.type(city, "Austin");
  await user.type(state, "TX");
  await user.type(postal, "78701");
};

describe("Checkout integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (mockOrder.update as jest.Mock).mockResolvedValue({});
    (mockOrder.getShippingOptions as jest.Mock).mockResolvedValue({
      shippingMethods: [{ method: "ground", cost: 5.99 }],
    });
    (mockOrder.createPaymentIntent as jest.Mock).mockResolvedValue({
      amount: 3099,
      freeOrder: false,
    });
    (mockDonation.getGiftValue as jest.Mock).mockResolvedValue({
      availableAmountCents: 0,
      items: [{ adjustedAmountAvailable: -3099, minShippingMethod: "ground" }],
    });
    (mockRefresh as jest.Mock).mockResolvedValue(null);
  });

  it("non-gift flow submits shipping then goes to method step", async () => {
    mockGetStoredGiftToken.mockReturnValue(null);

    const { container, user } = setupCheckout();
    await fillShippingForm(container, user);

    await user.click(
      await screen.findByRole("button", {
        name: /continue to shipping method/i,
      }),
    );

    await waitFor(() => {
      expect(mockOrder.getShippingOptions).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Shipping method")).toBeTruthy();
  });

  it("gift flow loads donation value and renders adjusted total", async () => {
    mockGetStoredGiftToken.mockReturnValue("gift_token_123");

    setupCheckout();

    await waitFor(() => {
      expect(mockDonation.getGiftValue).toHaveBeenCalled();
    });

    await screen.findByText("$30.99");
    expect(await screen.findByText("$30.99")).toBeTruthy();
  });
});
