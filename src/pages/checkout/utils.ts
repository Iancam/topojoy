import { getStoredGiftToken } from "@/lib/giftToken";

export const getGiftAccessToken = (cart: any) => {
  const config = cart?.orderItems[0].mapConfig;
  const giftAccessToken =
    config?.giftAccessToken || config?.parent?.giftAccessToken;
  return giftAccessToken || getStoredGiftToken();
};
