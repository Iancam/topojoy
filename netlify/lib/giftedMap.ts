import prisma from "./prisma";

/**
 * Creates a GiftedMap record linking a donor to the order they funded,
 * if the order was paid using a donation (gift token).
 *
 * - donorId: the User.id of the gift giver (from Donation.donorId)
 * - orderId: the order that was paid
 * - orderItems: the items on that order, used to pick the first mapConfigId
 *
 * Safe to call even if a GiftedMap already exists for the order (no-op on conflict).
 */
export async function createGiftedMapIfApplicable({
  donorId,
  orderId,
  orderItems,
  totalCost,
}: {
  donorId: string;
  orderId: string;
  orderItems: { mapConfigId?: string | null }[];
  totalCost: number;
}): Promise<void> {
  const existing = await prisma.giftedMap.findUnique({ where: { orderId } });
  if (existing) return;

  const mapConfigId =
    orderItems.find((i) => i.mapConfigId != null)?.mapConfigId ?? null;

  await prisma.giftedMap.create({
    data: {
      giftGiverId: donorId,
      orderId,
      mapConfigId: mapConfigId ?? undefined,
      totalCost,
    },
  });
}
