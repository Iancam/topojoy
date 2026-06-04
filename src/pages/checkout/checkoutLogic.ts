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

export const shouldUseGiftAutoFlow = ({
  giftToken,
  giftShippingMethod,
}: {
  giftToken: string | null;
  giftShippingMethod: string | null;
}): boolean => {
  return Boolean(giftToken && giftShippingMethod);
};

export const resolvePresetShippingIndex = (
  methods: Array<{ method?: string }>,
  giftShippingMethod: string,
): number | null => {
  if (methods.length === 0) return null;
  const presetIndex = methods.findIndex((m) => m.method === giftShippingMethod);
  return presetIndex >= 0 ? presetIndex : 0;
};

export const getStepAfterGiftPaymentIntent = (
  freeOrder: boolean,
): "confirm" | "payment" => {
  return freeOrder ? "confirm" : "payment";
};
