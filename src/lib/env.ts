export const getStripePublishableKey = (): string => {
  return import.meta.env.VITE_SBX_STRIPE_PUBLISHABLE_KEY;
};
