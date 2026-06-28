export function calculateTentativeAmountDrawn(donation: any) {
  const allocSum = donation.allocations.reduce(
    (sum: number, alloc: any) =>
      sum +
      (alloc.amountDrawn > 0 ? alloc.amountDrawn : (alloc.maxAmountDrawn ?? 0)),
    0,
  );
  return allocSum;
}
