import { describe, expect, it, beforeEach, jest } from "@jest/globals";

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    donation: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../lib", () => ({
  getShippingPrice: jest.fn(),
}));

const prismaMock = jest.requireMock("../lib/prisma").default as {
  donation: { findUnique: jest.Mock };
  orderItem: { findMany: jest.Mock };
};

const libMock = jest.requireMock("../lib") as {
  getShippingPrice: jest.Mock;
};

const loadHandler = async () => {
  const mod = await import("./donation-gift-value");
  return mod.handler;
};

describe("donation-gift-value handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-POST requests", async () => {
    const handler = await loadHandler();
    const res = await handler({ httpMethod: "GET" });

    expect(res.statusCode).toBe(405);
  });

  it("returns 400 when accessToken is missing", async () => {
    const handler = await loadHandler();
    const res = await handler({ httpMethod: "POST", body: JSON.stringify({}) });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toBe("Missing accessToken");
  });

  it("returns 404 when gift token is not found", async () => {
    prismaMock.donation.findUnique.mockResolvedValue(null);
    prismaMock.orderItem.findMany.mockResolvedValue([]);

    const handler = await loadHandler();
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ accessToken: "missing-token", items: [] }),
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).message).toBe("Gift not found");
  });

  it("returns adjusted gift values with cheapest shipping included", async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: "don_1",
      amount: 1000,
      status: "paid",
      expiryDate: new Date(Date.now() + 60_000),
      allocations: [{ amountDrawn: 100 }],
    });

    prismaMock.orderItem.findMany.mockResolvedValue([
      {
        subcategoryId: 10,
        width: 8,
        height: 10,
        orderItemOptions: [1],
        quantity: 1,
        itemPrice: 300,
      },
    ]);

    libMock.getShippingPrice.mockResolvedValue({
      shippingMethods: [
        { method: "ground", cost: 5 },
        { method: "2_day", cost: 10 },
      ],
    });

    const handler = await loadHandler();
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        accessToken: "gift_123",
        orderId: "order_1",
        items: [
          {
            subcategoryId: 20,
            width: 12,
            height: 16,
            options: [],
            quantity: 1,
          },
        ],
      }),
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);

    expect(payload.donationId).toBe("don_1");
    expect(payload.availableAmountCents).toBe(900);
    expect(payload.items[0].minShippingMethod).toBe("ground");
    expect(payload.items[0].minShippingCostCents).toBe(500);
    expect(payload.items[0].adjustedAmountAvailable).toBe(100);
  });
});
