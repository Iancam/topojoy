export const getAmountOwedCents = (
  giftAdjustedTotal: number | null,
): number | null => {
  if (giftAdjustedTotal === null) return null;
  return Math.max(0, -giftAdjustedTotal);
};

export const getShippingSubmitButtonLabel = ({
  submittingShipping,
  amountOwedCents,
}: {
  submittingShipping: boolean;
  amountOwedCents: number | null;
}): string => {
  if (submittingShipping) return "Loading options…";
  if (amountOwedCents === 0) return "Confirm order";
  return "Continue to shipping method";
};
