import Stripe from "stripe";
import { isProduction } from "./env";

export function initStripe() {
  const isProd = isProduction();

  const stripeSecretKey = isProd
    ? process.env.STRIPE_SECRET_KEY
    : process.env.SBX_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Debug logging
  console.log("Stripe initialization:", {
    CONTEXT: process.env.CONTEXT,
    NODE_ENV: process.env.NODE_ENV,
    isProduction: isProd,
    usingLiveKey: isProd,
    keyPrefix: stripeSecretKey?.substring(0, 7), // sk_live or sk_test
  });

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return new Stripe(stripeSecretKey);
}
export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
