import { FormEvent, useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

export const StripePaymentForm = ({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const data = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: "if_required",
      });
      const { error: stripeError } = data;
      console.log("stripe payment result", data);
      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        setSubmitting(false);
        return;
      }
      // Hand control back to the parent so it can mark the order paid
      // and move to the confirmation step.
      onSuccess();
    } catch (err: any) {
      setError("Payment failed");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between gap-2 pt-2">
        <button
          type="button"
          className="px-4 py-2 rounded-md border text-sm"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
          disabled={submitting || !stripe || !elements}
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>
      </div>
    </form>
  );
};
