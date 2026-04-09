export const getStripePublishableKey = (): string => {
  return import.meta.env.PROD
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    : import.meta.env.VITE_SBX_STRIPE_PUBLISHABLE_KEY;
};
