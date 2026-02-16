import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "react-router";
import { order, getImageUrlFromAws } from "./api";
import { Header } from "./components/Header";
import { formatMoney } from "./lib/utils";
import { StripePaymentForm } from "./components/StripePaymentForm";
import { useCartContext } from "./cartContext";
import { MapThumbnail } from "./components/MapThumbnail";

const CHECKOUT_STEPS = ["shipping", "method", "payment", "confirm"] as const;

type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

const SHIPPING_METHODS = [
  "default",
  "pickup",
  "ground",
  "ground_economy",
  "2_day",
  "overnight",
  "usps_ground_advantage",
  "usps_priority_mail",
  "usps_first_class_mail_international",
  "usps_priority_mail_international",
  "usps_priority_mail_express_international",
  "freight",
];

const describeShippingMethod = (option: {
  carrier?: string;
  method?: string;
}): { label: string; speedHint?: string } => {
  const carrier = option.carrier || "";
  const method = option.method || "";

  const lower = method.toLowerCase();

  const options = {
    ground_advantage: {
      label: `${carrier || "USPS"} Ground Advantage`,
      speedHint: "Economy (typically 3–5 business days)",
    },
    priority_mail_express: {
      label: `${carrier || "USPS"} Priority Mail Express`,
      speedHint: "Fastest (usually 1–2 business days)",
    },
    priority_mail: {
      label: `${carrier || "USPS"} Priority Mail`,
      speedHint: "Faster shipping (around 2–3 business days)",
    },
    "2_day": {
      label: `${carrier || "FedEx/UPS"} 2 Day`,
      speedHint: "2 business days",
    },
    ground_economy: {
      label: `${carrier || "FedEx/UPS"} Ground Economy`,
      speedHint: "Economy ground service",
    },
    ground: {
      label: `${carrier || "FedEx/UPS"} Ground`,
      speedHint: "Standard ground service",
    },
  };

  const key = Object.keys(options).filter((key) => lower.includes(key))[0];
  if (!key) {
    return {
      label: [carrier, method].filter(Boolean).join(" · ") || "Shipping option",
    };
  }
  return options[key as keyof typeof options];
};

const isValidStep = (value: string | null): value is CheckoutStep => {
  return CHECKOUT_STEPS.includes((value || "") as CheckoutStep);
};

export const Checkout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cart, loading, error, refresh } = useCartContext();
  const [localError, setLocalError] = useState<string | null>(null);
  const [submittingShipping, setSubmittingShipping] = useState<boolean>(false);

  const [shippingForm, setShippingForm] = useState({
    email: "",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  const [shippingOptions, setShippingOptions] = useState<any[] | null>(null);
  const [selectedShippingIndex, setSelectedShippingIndex] = useState<
    number | null
  >(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] =
    useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<any | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState<string | null>(null);
  const step: CheckoutStep = useMemo(() => {
    const raw = searchParams.get("step");
    if (!isValidStep(raw)) return "shipping";
    return raw;
  }, [searchParams]);

  const stripePromise = loadStripe(
    import.meta.env.VITE_SBX_STRIPE_PUBLISHABLE_KEY
  );
  // Rehydrate shipping form from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("checkout:shippingForm");
      if (stored) {
        const parsed = JSON.parse(stored);
        setShippingForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to restore shipping form", e);
    }
  }, []);

  // Persist shipping form whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "checkout:shippingForm",
        JSON.stringify(shippingForm)
      );
    } catch (e) {
      console.error("Failed to persist shipping form", e);
    }
  }, [shippingForm]);

  const goToStep = (next: CheckoutStep) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set("step", next);
      return updated;
    });
  };

  const currentStepIndex = CHECKOUT_STEPS.indexOf(step);

  const items = cart?.orderItems || [];
  const orderTotal =
    cart?.totalPrice ?? items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  // Selected shipping cost (in cents) if a method has been chosen
  const selectedShippingCostCents =
    selectedShippingIndex != null &&
    shippingOptions &&
    shippingOptions[selectedShippingIndex] &&
    typeof shippingOptions[selectedShippingIndex].cost === "number"
      ? Math.round(shippingOptions[selectedShippingIndex].cost * 100)
      : 0;

  const grandTotalCents = orderTotal + selectedShippingCostCents;

  useEffect(() => {
    if (step !== "confirm") return;
    setLatestLoading(true);
    setLatestError(null);
    order
      .getLatest({})
      .then((data) => {
        setLatestOrder(data);
      })
      .catch((err) => {
        console.error("Failed to load latest order", err);
        setLatestError("Failed to load order status.");
      })
      .finally(() => {
        setLatestLoading(false);
      });
  }, [step]);

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setShippingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitShipping = async (e: FormEvent) => {
    e.preventDefault();
    setShippingError(null);

    if (!cart || items.length === 0) return;

    if (!shippingForm.email || !shippingForm.name) {
      setShippingError("Please enter your email and name.");
      return;
    }
    if (
      !shippingForm.line1 ||
      !shippingForm.city ||
      !shippingForm.state ||
      !shippingForm.postalCode ||
      !shippingForm.country
    ) {
      setShippingError("Please complete your shipping address.");
      return;
    }

    setSubmittingShipping(true);
    try {
      // set address in order
      await order.update({
        address: shippingForm,
      });
      const data = await order.getShippingOptions({
        address: shippingForm,
        items: items.map((item) => ({
          subcategoryId: item.subcategoryId,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          options: item.orderItemOptions ?? [],
        })),
      });
      // Lumaprints returns { message, shippingMethods }
      console.log(data);
      setShippingOptions(data?.shippingMethods || []);
      goToStep("method");
    } catch (err) {
      console.error("Failed to fetch shipping options", err);
      setShippingError("Failed to load shipping options.");
    } finally {
      setSubmittingShipping(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (
      !shippingOptions ||
      selectedShippingIndex === null ||
      !shippingOptions[selectedShippingIndex]
    ) {
      return;
    }
    const selected = shippingOptions[selectedShippingIndex];
    const costShippingCents =
      typeof selected.cost === "number" ? Math.round(selected.cost * 100) : 0;
    setCreatingPaymentIntent(true);
    if (!cart) {
      setLocalError("Failed to load cart");
      return;
    }
    try {
      await order.update({
        shippingMethod: shippingOptions[selectedShippingIndex].method,
      });

      const data = await order.createPaymentIntent({});
      setClientSecret(data.clientSecret);
      setTotalAmount(data.amount);
      goToStep("payment");
    } catch (err) {
      console.error("Failed to create payment intent", err);
      setShippingError("Failed to start payment.");
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const steps = {
    shipping: (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Shipping information</h2>
        <p className="text-sm text-gray-500">
          Enter your email and shipping address so we can fetch live shipping
          options from our print partner.
        </p>
        <form className="space-y-4" onSubmit={handleSubmitShipping}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={shippingForm.email}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                name="name"
                value={shippingForm.name}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={shippingForm.phone}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address line 1
              </label>
              <input
                type="text"
                name="line1"
                value={shippingForm.line1}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address line 2 (optional)
              </label>
              <input
                type="text"
                name="line2"
                value={shippingForm.line2}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={shippingForm.city}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                State / Province
              </label>
              <input
                type="text"
                name="state"
                value={shippingForm.state}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Postal code
              </label>
              <input
                type="text"
                name="postalCode"
                value={shippingForm.postalCode}
                onChange={handleShippingChange}
                className="w-full border rounded px-2 py-1 text-sm"
                required
              />
            </div>
          </div>

          <div className="w-full md:w-1/3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              name="country"
              value={shippingForm.country}
              onChange={handleShippingChange}
              className="w-full border rounded px-2 py-1 text-sm bg-white"
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          </div>

          {shippingError && (
            <p className="text-sm text-red-600">{shippingError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
              disabled={submittingShipping}
            >
              {submittingShipping
                ? "Loading options…"
                : "Continue to shipping method"}
            </button>
          </div>
        </form>
      </div>
    ),
    method: (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Shipping method</h2>
        <p className="text-sm text-gray-500">
          Choose a shipping option. These prices and estimates come directly
          from our print partner.
        </p>

        {!shippingOptions && (
          <p className="text-sm text-gray-500">
            No shipping options loaded yet. Go back and confirm your shipping
            address.
          </p>
        )}

        {shippingOptions && shippingOptions.length === 0 && (
          <p className="text-sm text-red-600">
            No shipping methods are available for this address.
          </p>
        )}

        {shippingOptions && shippingOptions.length > 0 && (
          <div className="space-y-2">
            {shippingOptions.map((option, index) => {
              const id = option.method ?? index;
              const { label, speedHint } = describeShippingMethod(option);

              // cost from Lumaprints is in dollars
              const priceCents =
                typeof option.cost === "number"
                  ? Math.round(option.cost * 100)
                  : null;

              const isSelected = selectedShippingIndex === index;

              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 rounded border p-3 cursor-pointer text-sm ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    className="mt-1"
                    checked={isSelected}
                    onChange={() => setSelectedShippingIndex(index)}
                  />
                  <div className="flex-1 flex justify-between gap-4">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      {speedHint && (
                        <div className="text-xs text-gray-500">{speedHint}</div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {priceCents != null
                        ? formatMoney(priceCents)
                        : (option.cost ?? "")}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border text-sm"
            onClick={() => goToStep("shipping")}
          >
            Back
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
            disabled={
              !shippingOptions ||
              shippingOptions.length === 0 ||
              selectedShippingIndex === null ||
              creatingPaymentIntent
            }
            onClick={handleContinueToPayment}
          >
            {creatingPaymentIntent
              ? "Preparing payment…"
              : "Continue to payment"}
          </button>
        </div>
      </div>
    ),
    payment: (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Payment</h2>
        {!clientSecret && (
          <p className="text-sm text-gray-500">
            Preparing your payment details… If this takes too long, go back and
            try selecting a shipping method again.
          </p>
        )}

        {clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripePaymentForm
              onBack={() => goToStep("method")}
              onSuccess={async () => {
                try {
                  // Mark the current pending order as paid
                  // Submit the paid order to Lumaprints
                  refresh();
                } catch (err) {
                  console.error("Post-payment processing failed", err);
                }
                goToStep("confirm");
              }}
            />
          </Elements>
        )}
      </div>
    ),
    confirm: (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Order confirmation</h2>
        {latestLoading && (
          <p className="text-sm text-gray-500">Loading your order…</p>
        )}
        {latestError && <p className="text-sm text-red-600">{latestError}</p>}
        {latestOrder && !latestLoading && !latestError && (
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="font-semibold">Order ID:</span> {latestOrder.id}
            </div>
            <div>
              <span className="font-semibold">Status:</span>{" "}
              <span className="capitalize">{latestOrder.status}</span>
            </div>
            {latestOrder.submissionErrorMessage && (
              <div>
                <span className="font-semibold">Submission error:</span>{" "}
                <span className="text-red-600">
                  {latestOrder.submissionErrorMessage}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Placed at {new Date(latestOrder.createdAt).toLocaleString()}
            </div>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border text-sm"
            onClick={() => goToStep("payment")}
          >
            Back
          </button>
        </div>
      </div>
    ),
  };

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>

        <div className="flex gap-4 text-sm">
          {/* nav */}
          {CHECKOUT_STEPS.map((s, index) => {
            const isActive = s === step;
            const isComplete = index < currentStepIndex;
            return (
              <button
                key={s}
                type="button"
                className={`flex-1 py-2 border-b-2 text-center capitalize ${
                  isActive
                    ? "border-indigo-600 text-indigo-700 font-semibold"
                    : isComplete
                      ? "border-green-500 text-gray-700"
                      : "border-gray-200 text-gray-400"
                }`}
                onClick={() => {
                  if (!isComplete && !isActive) return;
                  goToStep(s);
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Loading cart…</p>}
            {(error || localError) && (
              <p className="text-sm text-red-600">{error || localError}</p>
            )}
            {!loading &&
              !error &&
              !localError &&
              (!cart || items.length === 0) && (
                <p className="text-sm text-gray-500">Your cart is empty.</p>
              )}
            {!loading &&
              !error &&
              !localError &&
              cart &&
              items.length > 0 &&
              steps[step]}
          </div>

          <aside className="border rounded-lg p-4 bg-white shadow-sm h-fit space-y-3">
            <h2 className="text-lg font-semibold">Summary</h2>
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => {
                  const s3Key = item.mapConfig?.s3Key;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 text-xs text-gray-700"
                    >
                      <div className="w-12 h-9 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                        {s3Key ? (
                          <MapThumbnail
                            title={item.filename || "Map preview"}
                            s3Key={s3Key}
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="truncate font-medium">
                          {item.filename || "Untitled map"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {item.printType} · {item.width}&quot; × {item.height}
                          &quot; · Qty {item.quantity}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items subtotal</span>
              <span className="font-semibold">{formatMoney(orderTotal)}</span>
            </div>
            {selectedShippingCostCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {formatMoney(selectedShippingCostCents)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-2 mt-1">
              <span className="text-gray-800 font-semibold">Total</span>
              <span className="font-semibold">
                {formatMoney(totalAmount || grandTotalCents)}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
