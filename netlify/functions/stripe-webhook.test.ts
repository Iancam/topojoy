import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.SBX_STRIPE_SECRET_KEY = "sk_test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

jest.mock("stripe", () => {
  const constructEvent = jest.fn();
  const StripeCtor = jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent },
  }));

  return {
    __esModule: true,
    default: StripeCtor,
    __mockConstructEvent: constructEvent,
  };
});

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    donation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../lib/lumaprints", () => ({
  submitOrderToLumaprints: jest.fn(),
}));

const prismaMock = jest.requireMock("../lib/prisma").default as {
  order: { findUnique: jest.Mock; update: jest.Mock };
  donation: { findUnique: jest.Mock; update: jest.Mock };
};

const lumaprintsMock = jest.requireMock("../lib/lumaprints") as {
  submitOrderToLumaprints: jest.Mock;
};

const stripeMock = jest.requireMock("stripe") as {
  __mockConstructEvent: jest.Mock;
};

const loadHandler = async () => {
  const mod = await import("./stripe-webhook");
  return mod.handler;
};

describe("stripe-webhook handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when signature verification fails", async () => {
    stripeMock.__mockConstructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const handler = await loadHandler();
    const res = await handler(
      {
        httpMethod: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      } as any,
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toMatch(/signature verification failed/i);
  });

  it("marks pending order as paid and submits to lumaprints on payment_intent.succeeded", async () => {
    stripeMock.__mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          metadata: { orderId: "order_1" },
        },
      },
    });

    prismaMock.order.findUnique.mockResolvedValue({ id: "order_1", status: "pending" });

    const handler = await loadHandler();
    const res = await handler(
      {
        httpMethod: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      } as any,
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({ status: "paid" }),
      }),
    );
    expect(lumaprintsMock.submitOrderToLumaprints).toHaveBeenCalledWith("order_1");
  });

  it("marks pending donation as failed on payment_intent.payment_failed", async () => {
    stripeMock.__mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_2",
          metadata: { donationId: "don_1" },
        },
      },
    });

    prismaMock.donation.findUnique.mockResolvedValue({ id: "don_1", status: "pending" });

    const handler = await loadHandler();
    const res = await handler(
      {
        httpMethod: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      } as any,
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(prismaMock.donation.update).toHaveBeenCalledWith({
      where: { id: "don_1" },
      data: { status: "failed" },
    });
  });
});
