import Stripe from "stripe";

export function initStripe() {
  const stripeSecretKey =
    process.env.NODE_ENV === "production"
      ? process.env.STRIPE_SECRET_KEY
      : process.env.SBX_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return new Stripe(stripeSecretKey);
}
export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
