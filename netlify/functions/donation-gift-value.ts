import prisma from "../lib/prisma";
import { error, getShippingPrice, success } from "../lib";

type LumaprintsItem = {
  subcategoryId: number;
  width: number;
  height: number;
  options: number[];
  quantity: number;
};

// A representative US address used to estimate shipping cost
const REPRESENTATIVE_ADDRESS = {
  name: "Gift Recipient",
  line1: "123 Main St",
  city: "Denver",
  state: "CO",
  postalCode: "80203",
  country: "US",
};

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const body = JSON.parse(event.body || "{}");
  const accessToken: string = body.accessToken;
  // New items being evaluated (e.g. from PrintOptions — one item per print type)
  const items: LumaprintsItem[] = body.items ?? [];
  // Optional: ID of the user's pending order, used to include existing items in shipping calculation
  const orderId: string | undefined = body.orderId;

  if (!accessToken) {
    return error("Missing accessToken", 400);
  }

  try {
    // Fetch donation and existing order items in parallel
    const [donationAllocation, existingOrderItems] = await Promise.all([
      prisma.donationAllocation.findUnique({
        where: { accessToken },
        select: {
          id: true,
          amountDrawn: true,
          maxAmountDrawn: true,
          donation: { select: { status: true, expiryDate: true, id: true } },
        },
      }),
      orderId
        ? prisma.orderItem.findMany({
            where: { orderId },
            select: {
              subcategoryId: true,
              width: true,
              height: true,
              orderItemOptions: true,
              quantity: true,
              itemPrice: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (!donationAllocation) {
      return error("Gift not found", 404);
    }

    if (donationAllocation.donation.status !== "paid") {
      return error("Gift payment not completed", 402);
    }
    const expiryDate = donationAllocation.donation.expiryDate;
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return error("Gift has expired", 410);
    }

    if (donationAllocation.amountDrawn > 0) {
      return error("Gift has already been partially redeemed", 409);
    }

    const availableAmountCents = donationAllocation.maxAmountDrawn ?? 0;

    // Sum of existing items' prices (cents), excluding the candidate item
    const existingItemsPriceCents = existingOrderItems.reduce(
      (sum, i) => sum + (i.itemPrice ?? 0),
      0,
    );

    // Existing items as Lumaprints shape for bundled shipping calculations
    const existingLumaItems: LumaprintsItem[] = existingOrderItems.map((i) => ({
      subcategoryId: i.subcategoryId,
      width: i.width,
      height: i.height,
      options: (i.orderItemOptions as number[]) ?? [],
      quantity: i.quantity,
    }));

    // Get cheapest shipping cost for the full order (existing + each candidate item)
    let adjustedItems: (LumaprintsItem & {
      minShippingCostCents: number;
      minShippingMethod: string | null;
      adjustedAmountAvailable: number;
    })[] = [];

    try {
      let shippingResults =
        items.length > 0
          ? await Promise.all(
              items.map(async (item) => ({
                ...item,
                shipping: await getShippingPrice({
                  address: REPRESENTATIVE_ADDRESS,
                  // Include existing order items so shipping reflects the full bundle
                  items: [
                    ...existingLumaItems,
                    {
                      subcategoryId: item.subcategoryId,
                      width: item.width,
                      height: item.height,
                      options: item.options,
                      quantity: item.quantity ?? 1,
                    },
                  ],
                }),
              })),
            )
          : [
              {
                shipping: await getShippingPrice({
                  address: REPRESENTATIVE_ADDRESS,
                  items: [...existingLumaItems],
                }),
              },
            ];

      adjustedItems = shippingResults.map((item) => {
        const methods: { cost: number; method: string }[] =
          item.shipping?.shippingMethods ?? [];
        const cheapest = methods.reduce<{
          cost: number;
          method: string;
        } | null>(
          (best, m) => (best === null || m.cost < best.cost ? m : best),
          null,
        );
        const minShippingCostCents = Math.round((cheapest?.cost ?? 0) * 100);
        // Remaining donation balance after covering shipping + existing items.
        // Negative means the user still owes that amount; positive means the donation covers everything and has leftover credit.
        const adjustedAmountAvailable =
          availableAmountCents - minShippingCostCents - existingItemsPriceCents;

        return {
          ...item,
          minShippingCostCents,
          minShippingMethod: cheapest?.method ?? null,
          adjustedAmountAvailable,
        };
      });
    } catch (err) {
      console.warn("Could not fetch shipping estimate, defaulting to 0", err);
    }

    return success({
      donationId: donationAllocation.donation.id,
      donationAllocationId: donationAllocation.id,
      availableAmountCents,
      items: adjustedItems,
    });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
};
