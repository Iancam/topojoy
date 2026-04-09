import Stripe from "stripe";

export function initStripe() {
  // Use Netlify's CONTEXT variable (production, deploy-preview, branch-deploy)
  // or fallback to NODE_ENV
  const isProduction =
    process.env.CONTEXT === "production" ||
    process.env.NODE_ENV === "production";

  const stripeSecretKey = isProduction
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
