import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.SBX_STRIPE_SECRET_KEY = "sk_test";
process.env.CLERK_SECRET_KEY = "clerk_secret";
process.env.VITE_CLERK_PUBLISHABLE_KEY = "clerk_pub";

jest.mock("stripe", () => {
  const paymentIntentsCreate = jest.fn();
  const StripeCtor = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: paymentIntentsCreate,
    },
  }));

  return {
    __esModule: true,
    default: StripeCtor,
    __mockPaymentIntentsCreate: paymentIntentsCreate,
  };
});

jest.mock("@clerk/backend", () => ({
  createClerkClient: jest.fn(() => ({})),
}));

jest.mock("../lib", () => ({
  auth: jest.fn(),
  getShippingPrice: jest.fn(),
}));

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    donation: {
      findUnique: jest.fn(),
    },
    donationAllocation: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../lib/lumaprints", () => ({
  submitOrderToLumaprints: jest.fn(),
}));

const libMock = jest.requireMock("../lib") as {
  auth: jest.Mock;
  getShippingPrice: jest.Mock;
};

const prismaMock = jest.requireMock("../lib/prisma").default as {
  order: { findFirst: jest.Mock; update: jest.Mock };
  donation: { findUnique: jest.Mock };
  donationAllocation: { create: jest.Mock };
};

const lumaprintsMock = jest.requireMock("../lib/lumaprints") as {
  submitOrderToLumaprints: jest.Mock;
};

const stripeMock = jest.requireMock("stripe") as {
  __mockPaymentIntentsCreate: jest.Mock;
};

const loadHandler = async () => {
  const mod = await import("../functions/stripe-create-payment-intent");
  return mod.handler;
};

describe("stripe-create-payment-intent handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    libMock.auth.mockResolvedValue("user_1");
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order_1",
      userId: "user_1",
      status: "pending",
      currency: "usd",
      totalPrice: 1000,
      shippingMethod: "ground",
      recipient: {
        line1: "123 Main",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
      },
      orderItems: [
        {
          subcategoryId: 10,
          width: 8,
          height: 10,
          quantity: 1,
          orderItemOptions: [],
        },
      ],
    });
    libMock.getShippingPrice.mockResolvedValue({
      message: "ok",
      shippingMethods: [{ method: "ground", cost: 5 }],
    });
    stripeMock.__mockPaymentIntentsCreate.mockResolvedValue({
      client_secret: "pi_secret_123",
    });
  });

  it("returns 401 when user is unauthorized", async () => {
    libMock.auth.mockResolvedValue(null);

    const handler = await loadHandler();
    const res = await handler({ httpMethod: "POST", body: JSON.stringify({}) });

    expect(res.statusCode).toBe(401);
  });

  it("creates payment intent for payable orders", async () => {
    const handler = await loadHandler();
    const res = await handler({ httpMethod: "POST", body: JSON.stringify({}) });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.clientSecret).toBe("pi_secret_123");
    expect(payload.amount).toBe(1500);
    expect(stripeMock.__mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500,
        currency: "usd",
        metadata: { orderId: "order_1" },
      }),
    );
  });

  it("marks order paid and submits when gift token fully covers amount", async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: "don_1",
      amount: 3000,
      expiryDate: new Date(Date.now() + 60_000),
      status: "paid",
      allocations: [],
    });

    const handler = await loadHandler();
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ giftToken: "gift_123" }),
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ freeOrder: true, amount: 0 });
    expect(prismaMock.donationAllocation.create).toHaveBeenCalledWith({
      data: {
        donationId: "don_1",
        orderId: "order_1",
        amountDrawn: 1500,
      },
    });
    expect(prismaMock.order.update).toHaveBeenCalled();
    expect(lumaprintsMock.submitOrderToLumaprints).toHaveBeenCalledWith(
      "order_1",
    );
    expect(stripeMock.__mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("charges only remaining amount when donation does not fully cover shipping", async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: "don_1",
      amount: 1200,
      expiryDate: new Date(Date.now() + 60_000),
      status: "paid",
      allocations: [],
    });

    const handler = await loadHandler();
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ giftToken: "gift_123" }),
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.amount).toBe(300);
    expect(payload.clientSecret).toBe("pi_secret_123");

    expect(prismaMock.donationAllocation.create).toHaveBeenCalledWith({
      data: {
        donationId: "don_1",
        orderId: "order_1",
        amountDrawn: 1200,
      },
    });

    expect(stripeMock.__mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 300 }),
    );
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(lumaprintsMock.submitOrderToLumaprints).not.toHaveBeenCalled();
  });
});
