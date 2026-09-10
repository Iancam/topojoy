export function calculateTentativeAmountDrawn(donation: any) {
  const allocSum = donation.allocations.reduce(
    (sum: number, alloc: any) =>
      sum +
      (alloc.amountDrawn > 0 ? alloc.amountDrawn : (alloc.maxAmountDrawn ?? 0)),
    0,
  );
  return allocSum;
}

// A code presented at checkout ("gift token") resolves to either:
//  - a single, standalone DonationAllocation (accessToken lives on the
//    allocation itself), or
//  - a GiftToken grouping several DonationAllocations together, whose
//    combined balance is drawn down as one pool.
// This normalizes both shapes so checkout code doesn't need to special-case.
export type ResolvedGiftCode = {
  giftTokenId: string | null;
  allocationIds: string[];
  status: string;
  expiryDate: Date;
  availableAmountCents: number;
  totalAmountDrawn: number;
};

function resolveFromAllocations(
  allocations: any[],
  giftTokenId: string | null,
): ResolvedGiftCode {
  const notPaid = allocations.find((a) => a.donation.status !== "paid");
  const status = notPaid ? notPaid.donation.status : "paid";
  const expiryDate = allocations.reduce(
    (earliest, a) =>
      a.donation.expiryDate < earliest ? a.donation.expiryDate : earliest,
    allocations[0].donation.expiryDate,
  );
  const totalAmountDrawn = allocations.reduce(
    (sum, a) => sum + a.amountDrawn,
    0,
  );
  const availableAmountCents = allocations.reduce((sum, a) => {
    const cap =
      a.maxAmountDrawn ??
      a.donation.amount - calculateTentativeAmountDrawn(a.donation);
    return sum + Math.max(0, cap - a.amountDrawn);
  }, 0);

  return {
    giftTokenId,
    allocationIds: allocations.map((a) => a.id),
    status,
    expiryDate,
    availableAmountCents,
    totalAmountDrawn,
  };
}

// Looks up an accessToken against GiftToken first (pooled/aggregated codes),
// falling back to a standalone DonationAllocation (legacy/single codes).
export async function resolveGiftCode(
  prisma: any,
  accessToken: string,
): Promise<ResolvedGiftCode | null> {
  const giftToken = await prisma.giftToken.findUnique({
    where: { accessToken },
    include: {
      allocations: {
        include: { donation: { include: { allocations: true } } },
      },
    },
  });
  if (giftToken) {
    return resolveFromAllocations(giftToken.allocations, giftToken.id);
  }

  const allocation = await prisma.donationAllocation.findUnique({
    where: { accessToken },
    include: { donation: { include: { allocations: true } } },
  });
  if (allocation) {
    return resolveFromAllocations([allocation], null);
  }

  return null;
}

// Draws `amountCents` down across the allocations backing a resolved gift
// code, oldest funding source first, so a single checkout can spend across
// several pooled donations. Returns the per-allocation amounts drawn.
export async function drawDownGiftCode(
  prisma: any,
  resolved: ResolvedGiftCode,
  amountCents: number,
  orderId: string,
) {
  const allocations = await prisma.donationAllocation.findMany({
    where: { id: { in: resolved.allocationIds } },
    include: { donation: { include: { allocations: true } } },
    orderBy: { createdAt: "asc" },
  });

  let remaining = amountCents;
  const draws: { id: string; amountDrawn: number }[] = [];

  for (const alloc of allocations) {
    if (remaining <= 0) break;
    const cap =
      alloc.maxAmountDrawn ??
      alloc.donation.amount - calculateTentativeAmountDrawn(alloc.donation);
    const available = Math.max(0, cap - alloc.amountDrawn);
    const draw = Math.min(available, remaining);
    if (draw <= 0) continue;
    draws.push({ id: alloc.id, amountDrawn: alloc.amountDrawn + draw });
    remaining -= draw;
  }

  await prisma.$transaction(
    draws.map(({ id, amountDrawn }) =>
      prisma.donationAllocation.update({
        where: { id },
        data: { orderId, amountDrawn },
      }),
    ),
  );

  return draws;
}
