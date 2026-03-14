import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Header } from "./components/Header";
import { toFormElement } from "./components/configForm";
import { StripePaymentForm } from "./components/StripePaymentForm";
import { donation } from "./api";
import {
  donationFormElements,
  donationJourney,
  DonationForm,
} from "./components/donationFormData";

const stripePromise = loadStripe(
  import.meta.env.VITE_SBX_STRIPE_PUBLISHABLE_KEY,
);

type Phase = "form" | "payment" | "confirmation";

export default function DonationPage() {
  const [form, setForm] = React.useState<DonationForm>(
    Object.fromEntries(
      Object.entries(donationFormElements).map(([key, [_, __, value]]) => [
        key,
        value,
      ]),
    ) as DonationForm,
  );
  const [phase, setPhase] = React.useState<Phase>("form");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [donationId, setDonationId] = React.useState<string | null>(null);
  const [giftAccessToken, setGiftAccessToken] = React.useState<string | null>(
    null,
  );
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFormChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await (
        donation.createPaymentIntent as unknown as (body: any) => Promise<any>
      )(form);
      setClientSecret(data.clientSecret);
      setDonationId(data.donationId);
      setGiftAccessToken(data.accessToken ?? null);
      setPhase("payment");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const phaseComponents = {
    form: (
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Make a Donation
          </h1>
          <p className="text-gray-500 text-sm">
            Gift a map to someone — or contribute to the community pool. No
            account required.
          </p>
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-8"
        >
          {donationJourney.map((section) => (
            <section key={section.title}>
              <div className="mb-4">
                <h1 className="text-xl font-semibold text-gray-800">
                  {section.title}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {section.description}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {section.formElements
                  .filter((key) => {
                    if (
                      form.discretionary &&
                      ["public", "restricted", "donateResiduals"].includes(key)
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map(toFormElement(form, onFormChange, donationFormElements))}
              </div>
            </section>
          ))}

          {error && <p className="text-sm text-red-600 -mt-4">{error}</p>}
          <div className="border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {loading
                ? "Preparing payment…"
                : `Continue to payment — $${form.amount || 0}`}
            </button>
          </div>
        </form>
      </div>
    ),
    payment: (
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment</h1>
          <p className="text-gray-500 text-sm">
            Donating{" "}
            <span className="font-semibold text-gray-700">${form.amount}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: clientSecret ?? undefined }}
          >
            <StripePaymentForm
              onBack={() => setPhase("form")}
              onSuccess={() => setPhase("confirmation")}
            />
          </Elements>
        </div>
      </div>
    ),
    confirmation: (
      <div className="text-center max-w-md px-6">
        <div className="text-4xl mb-4">🎁</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Thank you!
        </h1>
        <p className="text-gray-500 text-sm">
          Your donation of ${form.amount} has been received.
        </p>
        {giftAccessToken && (
          <div className="mt-6 text-left">
            <p className="text-sm font-medium text-gray-600 mb-3">
              Share this private gift link with the recipient:
            </p>
            <div className="flex flex-col gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
              <span className="text-base font-mono text-gray-800 break-all leading-relaxed">
                {`${window.location.origin}/gift/${giftAccessToken}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/gift/${giftAccessToken}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        )}
        {donationId && (
          <p className="text-xs text-gray-400 mt-4 font-mono">
            ID: {donationId}
          </p>
        )}
      </div>
    ),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex items-start justify-center pt-24 pb-16 px-4">
        {phaseComponents[phase]}
      </div>
    </div>
  );
}
