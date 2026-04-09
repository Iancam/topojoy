import { initStripe } from "../lib/stripe";
import { createClerkClient } from "@clerk/backend";
import { auth } from "../lib";
import prisma from "../lib/prisma";
import crypto from "crypto";
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

const stripe = initStripe();

function generateSecureRandomString(length: number, charSet: string) {
  let result = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += charSet[bytes[i] % charSet.length];
  }
  return result;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    const clerkUserId = await auth(event, clerkClient);
    // if (!clerkUserId) {
    //   return {
    //     statusCode: 401,
    //     body: JSON.stringify({ message: "Unauthorized" }),
    //   };
    // }
    let donor;
    if (clerkUserId) {
      donor = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (!donor) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "User not found" }),
        };
      }
    }

    const body = JSON.parse(event.body || "{}");
    const {
      amount,
      message,
      public: isPublic,
      restricted,
      donateResiduals,
      discretionary,
      // expiryDate: expiryDateStr,
    } = body;

    if (!amount || typeof amount !== "number" || amount < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid amount" }),
      };
    }

    const amountCents = Math.round(amount * 100);
    const isPrivate = !(isPublic ?? true);

    const alphanumeric =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    // Usage for a 6-character alphanumeric string:
    const secureString = generateSecureRandomString(6, alphanumeric);

    const accessToken = isPrivate ? secureString : undefined;

    const donation = await prisma.donation.create({
      data: {
        amount: amountCents,
        message,
        public: isPublic ?? true,
        restricted: restricted ?? false,
        donateResiduals: donateResiduals ?? true,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year default
        discretionary,
        donor: donor ? { connect: { id: donor.id } } : undefined,
        ...(accessToken ? { accessToken } : {}),
      },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      metadata: {
        donationId: donation.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        donationId: donation.id,
        amount: amountCents,
        accessToken: accessToken ?? null,
      }),
    };
  } catch (error: any) {
    console.error("donation-create-payment-intent error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Internal server error",
      }),
    };
  }
};
