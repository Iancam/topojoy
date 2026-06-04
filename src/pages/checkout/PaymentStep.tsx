import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { StripePaymentForm } from "@/components/StripePaymentForm";

type Props = {
  clientSecret: string | null;
  stripePromise: Promise<Stripe | null>;
  onBack: () => void;
  onSuccess: () => void;
};

export const PaymentStep = ({
  clientSecret,
  stripePromise,
  onBack,
  onSuccess,
}: Props) => {
  console.log("clientSecret", clientSecret);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payment</h2>
      {!clientSecret && (
        <p className="text-sm text-gray-500">
          Preparing your payment details… If this takes too long, go back and
          try selecting a shipping method again.
        </p>
      )}
      {clientSecret && (
        <Elements
          key={clientSecret}
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <StripePaymentForm onBack={onBack} onSuccess={onSuccess} />
        </Elements>
      )}
    </div>
  );
};
