import { FormEvent } from "react";
import { getShippingSubmitButtonLabel } from "./checkoutLogic";

export type ShippingForm = {
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Props = {
  shippingForm: ShippingForm;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  error: string | null;
  amountOwedCents: number | null;
};

export const ShippingStep = ({
  shippingForm,
  onChange,
  onSubmit,
  submitting,
  error,
  amountOwedCents,
}: Props) => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Shipping information</h2>
    <p className="text-sm text-gray-500">
      Enter your email and shipping address so we can fetch live shipping
      options from our print partner.
    </p>
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={shippingForm.email}
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
          onChange={onChange}
          className="w-full border rounded px-2 py-1 text-sm bg-white"
          required
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
          disabled={submitting}
        >
          {getShippingSubmitButtonLabel({
            submittingShipping: submitting,
            amountOwedCents,
          })}
        </button>
      </div>
    </form>
  </div>
);
