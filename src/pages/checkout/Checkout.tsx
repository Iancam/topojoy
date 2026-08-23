import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "react-router";
import { order, donation } from "../../api";
import { Header } from "../../components/Header";
import { formatMoney } from "../../lib/utils";
import { getStripePublishableKey } from "../../lib/env";
import { useCartContext } from "../../cartContext";
import { MapThumbnail } from "../../components/MapThumbnail";
import { getStoredGiftToken } from "../../lib/giftToken";
import {
  getAmountOwedCents,
  getStepAfterGiftPaymentIntent,
  resolvePresetShippingIndex,
  shouldUseGiftAutoFlow,
} from "./checkoutLogic";
import { ShippingStep, type ShippingForm } from "./ShippingStep";
import { MethodStep, type ShippingOption } from "./MethodStep";
import { PaymentStep } from "./PaymentStep";
import { ConfirmStep } from "./ConfirmStep";
import { CheckoutSummary } from "./CheckoutSummary";
import { getGiftAccessToken } from "./utils";

const CHECKOUT_STEPS = ["shipping", "method", "payment", "confirm"] as const;
type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

const isValidStep = (value: string | null): value is CheckoutStep =>
  CHECKOUT_STEPS.includes((value || "") as CheckoutStep);

const stripePromise = loadStripe(getStripePublishableKey());

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

  const [giftToken, setGiftToken] = useState<string | null>(null);
  const [giftCreditCents, setGiftCreditCents] = useState<number | null>(null);
  const [giftAdjustedTotal, setGiftAdjustedTotal] = useState<number | null>(
    null,
  );
  const [giftShippingMethod, setGiftShippingMethod] = useState<string | null>(
    null,
  );

  // Load gift token on mount
  useEffect(() => {
    const token = getGiftAccessToken(cart);
    if (!token) return;
    setGiftToken(token);
  }, []);

  // Fetch per-item gift adjustments once cart items and token are available
  useEffect(() => {
    if (!giftToken || !items.length) return;

    donation
      .getGiftValue({
        accessToken: giftToken,
        orderId: cart?.id,
        items: [] as any[],
        // items: items.map((item) => ({
        //   subcategoryId: item.subcategoryId,
        //   width: item.width,
        //   height: item.height,
        //   options: item.orderItemOptions ?? [],
        // })),
      })
      .then((data: any) => {
        if (typeof data.availableAmountCents === "number") {
          console.log(data);
          setGiftCreditCents(data.availableAmountCents);
        }

        const aggregate = data.items?.[0];

        if (!aggregate) return;
        setGiftAdjustedTotal(aggregate.adjustedAmountAvailable);
        setGiftShippingMethod(aggregate.minShippingMethod);
      })
      .catch((_err: unknown) => {});
  }, [giftToken, cart?.orderItems]);

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

  useEffect(() => {
    if (!cart?.id) return;

    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (!updated.get("orderId")) updated.set("orderId", cart.id);
        return updated;
      },
      { replace: true },
    );
  }, [cart?.id]);

  // Persist shipping form whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "checkout:shippingForm",
        JSON.stringify(shippingForm),
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
  const amountOwedCents = getAmountOwedCents(giftAdjustedTotal);

  // When the gift credit fully covers the order, the method and payment
  // steps are skipped entirely (see handleSubmitShipping's gift auto-flow),
  // so don't show them in the step nav either.
  const visibleSteps: CheckoutStep[] =
    amountOwedCents === 0
      ? CHECKOUT_STEPS.filter((s) => s !== "method" && s !== "payment")
      : [...CHECKOUT_STEPS];

  const currentStepIndex = visibleSteps.indexOf(step);

  useEffect(() => {
    if (step !== "confirm") return;
    const orderId = searchParams.get("orderId");
    if (!orderId) return;
    setLatestLoading(true);
    setLatestError(null);

    order
      .get({ orderId })
      .then((data: unknown) => {
        setLatestOrder(data);
      })
      .catch((err: unknown) => {
        console.error("Failed to load latest order", err);
        setLatestError("Failed to load order status.");
      })
      .finally(() => {
        setLatestLoading(false);
      });
  }, [step]);

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      const methods: any[] = data?.shippingMethods || [];
      setShippingOptions(methods);

      // If the user has a gift token, auto-select the preset cheapest method and skip the method step
      if (shouldUseGiftAutoFlow({ giftToken, giftShippingMethod })) {
        const resolvedIndex = resolvePresetShippingIndex(
          methods,
          giftShippingMethod ?? "",
        );
        if (resolvedIndex === null || !methods[resolvedIndex]) {
          setShippingError(
            "No shipping methods are available for this address.",
          );
          return;
        }

        setSelectedShippingIndex(resolvedIndex);
        setCreatingPaymentIntent(true);
        setClientSecret(null);
        await order.update({ shippingMethod: methods[resolvedIndex].method });

        const data = await order.createPaymentIntent({ giftToken });

        setTotalAmount(data.amount);
        setClientSecret(data.clientSecret);
        console.log("setting clientSecret, handleSubmitShipping");
        goToStep(getStepAfterGiftPaymentIntent(Boolean(data.freeOrder)));
      } else {
        goToStep("method");
      }
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
    setClientSecret(null);
    if (!cart) {
      setLocalError("Failed to load cart");
      return;
    }
    try {
      await order.update({
        shippingMethod: shippingOptions[selectedShippingIndex].method,
      });

      const data = await order.createPaymentIntent({ giftToken });

      setTotalAmount(data.amount);

      if (data.freeOrder) {
        refresh();
        goToStep("confirm");
        return;
      }
      console.log("setting clientSecret, handleContinueToPayment", {
        data,
      });
      setClientSecret(data.clientSecret);
      goToStep("payment");
    } catch (err) {
      console.error("Failed to create payment intent", err);
      setShippingError("Failed to start payment./n" + (err as Error).message);
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const stepContent: Record<CheckoutStep, React.ReactNode> = {
    shipping: (
      <ShippingStep
        shippingForm={shippingForm}
        onChange={handleShippingChange}
        onSubmit={handleSubmitShipping}
        submitting={submittingShipping}
        error={shippingError}
        amountOwedCents={amountOwedCents}
      />
    ),
    method: (
      <MethodStep
        shippingOptions={shippingOptions}
        selectedIndex={selectedShippingIndex}
        onSelect={setSelectedShippingIndex}
        onBack={() => goToStep("shipping")}
        onContinue={handleContinueToPayment}
        loading={creatingPaymentIntent}
      />
    ),
    payment: (
      <PaymentStep
        clientSecret={clientSecret}
        stripePromise={stripePromise}
        onBack={() => {
          setClientSecret(null);
          goToStep("method");
        }}
        onSuccess={async () => {
          try {
            await refresh().then((cart) => {
              console.log("Refreshed data:", cart);
            });
          } catch (err) {
            console.error("Post-payment processing failed", err);
          }
          setClientSecret(null);
          goToStep("confirm");
        }}
      />
    ),
    confirm: (
      <ConfirmStep
        order={latestOrder}
        loading={latestLoading}
        error={latestError}
        onBack={() => goToStep("payment")}
      />
    ),
  };

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>

        <div className="flex gap-4 text-sm">
          {/* nav */}
          {visibleSteps.map((s, index) => {
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
            {!loading && !error && !localError && cart && stepContent[step]}
          </div>

          <CheckoutSummary
            items={items}
            selectedShippingCostCents={selectedShippingCostCents}
            orderTotal={orderTotal}
            amountOwedCents={amountOwedCents}
            grandTotalCents={grandTotalCents}
            totalAmount={totalAmount}
            giftAccessToken={giftToken}
          />
        </div>
      </div>
    </div>
  );
};
