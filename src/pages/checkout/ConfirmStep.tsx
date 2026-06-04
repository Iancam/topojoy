type Props = {
  order: any | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
};

export const ConfirmStep = ({ order, loading, error, onBack }: Props) => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Order confirmation</h2>
    {loading && <p className="text-sm text-gray-500">Loading your order…</p>}
    {error && <p className="text-sm text-red-600">{error}</p>}
    {order && !loading && !error && (
      <div className="text-sm text-gray-700 space-y-1">
        <div>
          <span className="font-semibold">Order ID:</span> {order.id}
        </div>
        <div>
          <span className="font-semibold">Status:</span>{" "}
          <span className="capitalize">{order.status}</span>
        </div>
        {order.submissionErrorMessage && (
          <div>
            <span className="font-semibold">Submission error:</span>{" "}
            <span className="text-red-600">{order.submissionErrorMessage}</span>
          </div>
        )}
        <div className="text-xs text-gray-500">
          {order.submittedAt
            ? "Submitted at " + new Date(order.submittedAt).toLocaleString()
            : order.paidAt
              ? "Paid at " + new Date(order.paidAt).toLocaleString()
              : "Not placed yet"}
        </div>
      </div>
    )}
    <div className="flex justify-between gap-2">
      <button
        type="button"
        className="px-4 py-2 rounded-md border text-sm"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  </div>
);
