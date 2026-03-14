export const GIFT_TOKEN_KEY = "topojoy_gift_token";

export const getStoredGiftToken = (): string | null =>
  localStorage.getItem(GIFT_TOKEN_KEY);

export const clearStoredGiftToken = (): void =>
  localStorage.removeItem(GIFT_TOKEN_KEY);
