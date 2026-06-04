import { formatMoney } from "@/lib/utils";

export type ShippingOption = {
  method?: string;
  carrier?: string;
  cost?: number;
};

const describeShippingMethod = (option: ShippingOption): { label: string; speedHint?: string } => {
  const carrier = option.carrier || "";
  const method = option.method || "";
  const lower = method.toLowerCase();

  const options: Record<string, { label: string; speedHint?: string }> = {
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

  const key = Object.keys(options).filter((k) => lower.includes(k))[0];
  if (!key) {
    return { label: [carrier, method].filter(Boolean).join(" · ") || "Shipping option" };
  }
  return options[key];
};

type Props = {
  shippingOptions: ShippingOption[] | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
  loading: boolean;
};

export const MethodStep = ({
  shippingOptions,
  selectedIndex,
  onSelect,
  onBack,
  onContinue,
  loading,
}: Props) => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Shipping method</h2>
    <p className="text-sm text-gray-500">
      Choose a shipping option. These prices and estimates come directly from
      our print partner.
    </p>

    {!shippingOptions && (
      <p className="text-sm text-gray-500">
        No shipping options loaded yet. Go back and confirm your shipping address.
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
          const priceCents =
            typeof option.cost === "number" ? Math.round(option.cost * 100) : null;
          const isSelected = selectedIndex === index;

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
                onChange={() => onSelect(index)}
              />
              <div className="flex-1 flex justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-900">{label}</div>
                  {speedHint && (
                    <div className="text-xs text-gray-500">{speedHint}</div>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {priceCents != null ? formatMoney(priceCents) : (option.cost ?? "")}
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
        onClick={onBack}
      >
        Back
      </button>
      <button
        type="button"
        className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
        disabled={
          !shippingOptions ||
          shippingOptions.length === 0 ||
          selectedIndex === null ||
          loading
        }
        onClick={onContinue}
      >
        {loading ? "Preparing payment…" : "Continue to payment"}
      </button>
    </div>
  </div>
);
