import { admin } from "@/api";
import { formatMoney } from "@/lib/utils";
import { FormEvent, useState } from "react";

export type AdminAllocation = {
  id: string;
  accessToken: string | null;
  maxAmountDrawn: number | null;
  useFullAmount: boolean;
  amountDrawn: number;
  orderId: string | null;
  createdAt: string;
};

export type AdminDonation = {
  id: string;
  amount: number;
  status: string;
  restricted: boolean;
  public: boolean;
  discretionary: boolean;
  message: string | null;
  donateResiduals: boolean;
  expiryDate: string;
  createdAt: string;
  totalAmountDrawn: number;
  effectiveAmountDrawn: number;
  allocations: AdminAllocation[];
  donor: { id: string; email: string | null } | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
      title="Copy"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

function AllocationCreateForm({
  donationId,
  donationAmount,
  onCreated,
}: {
  donationId: string;
  donationAmount: number;
  onCreated: (allocation: AdminAllocation) => void;
}) {
  const [useFullAmount, setUseFullAmount] = useState(false);
  const [maxAmountDrawn, setMaxAmountDrawn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const dollars = parseFloat(maxAmountDrawn);
    if (!useFullAmount && (isNaN(dollars) || dollars <= 0)) {
      setErr("Enter a valid max amount");
      return;
    }
    const cents = useFullAmount ? undefined : Math.round(dollars * 100);
    if (!useFullAmount && cents! > donationAmount) {
      setErr(`Cannot exceed donation total (${formatMoney(donationAmount)})`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await admin.donationAllocationCreate({
        donationId,
        maxAmountDrawn: cents,
        useFullAmount,
      });
      setMaxAmountDrawn("");
      setUseFullAmount(false);
      onCreated(result);
    } catch (e: any) {
      setErr(e?.message || "Failed to create allocation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-wrap items-end gap-3 pt-3 border-t border-gray-100"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
          Max Amount
        </label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 50.00"
          value={maxAmountDrawn}
          onChange={(e) => setMaxAmountDrawn(e.target.value)}
          disabled={useFullAmount || submitting}
          className="w-32 text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
      <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer pb-1.5">
        <input
          type="checkbox"
          checked={useFullAmount}
          onChange={(e) => setUseFullAmount(e.target.checked)}
          disabled={submitting}
        />
        Use full donation balance
      </label>
      <button
        type="submit"
        disabled={submitting}
        className={`pb-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
          submitting
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-teal-100 text-teal-700 hover:bg-teal-200"
        }`}
      >
        {submitting ? "Creating…" : "+ Create Allocation"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </form>
  );
}

function DonationRow({
  donation,
  onAllocationCreated,
  onAllocationDeleted,
}: {
  donation: AdminDonation;
  onAllocationCreated: (id: string, allocation: AdminAllocation) => void;
  onAllocationDeleted: (donationId: string, allocationId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (allocationId: string) => {
    setDeletingId(allocationId);
    try {
      await admin.donationAllocationDelete({ id: allocationId });
      onAllocationDeleted(donation.id, allocationId);
    } catch (e: any) {
      alert(e?.message || "Failed to delete allocation");
    } finally {
      setDeletingId(null);
    }
  };
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {formatMoney(donation.amount)}
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                donation.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {donation.status}
            </span>
            {donation.restricted && (
              <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-mono">
                restricted
              </span>
            )}
            {donation.public && (
              <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-mono">
                public
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Drawn: {formatMoney(donation.totalAmountDrawn)} &bull; Effective:{" "}
            {formatMoney(donation.effectiveAmountDrawn)} /{" "}
            {formatMoney(donation.amount)} &bull; {donation.allocations.length}{" "}
            allocation
            {donation.allocations.length !== 1 ? "s" : ""}
            {donation.donor?.email && <> &bull; {donation.donor.email}</>}
          </div>
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {new Date(donation.createdAt).toLocaleDateString()}
        </div>
        <span className="text-gray-400 text-xs shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {donation.allocations.length === 0 ? (
            <div className="text-xs text-gray-400 mb-2">
              No allocations yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-2">
              {donation.allocations.map((a) => (
                <div
                  key={a.id}
                  className="rounded border border-gray-100 bg-gray-50 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide shrink-0">
                      Gift Link
                    </span>
                    {a.accessToken ? (
                      <>
                        <a
                          href={`${window.location.origin}/gift/${a.accessToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-teal-700 hover:underline truncate max-w-[220px]"
                          title={`${window.location.origin}/gift/${a.accessToken}`}
                        >
                          {window.location.host}/gift/{a.accessToken}
                        </a>
                        <CopyButton
                          text={`${window.location.origin}/gift/${a.accessToken}`}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Cap:{" "}
                    {a.useFullAmount ? (
                      <span className="italic">full balance</span>
                    ) : a.maxAmountDrawn != null ? (
                      formatMoney(a.maxAmountDrawn)
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Drawn: {formatMoney(a.amountDrawn)}
                  </div>
                  {a.orderId && (
                    <div className="text-xs text-gray-400 font-mono">
                      order: {a.orderId}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-300 ml-auto">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                  {a.amountDrawn === 0 && (
                    <button
                      type="button"
                      disabled={deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                      className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors ml-1"
                    >
                      {deletingId === a.id ? "deleting…" : "delete"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <AllocationCreateForm
            donationId={donation.id}
            donationAmount={donation.amount}
            onCreated={(allocation) =>
              onAllocationCreated(donation.id, allocation)
            }
          />
        </div>
      )}
    </div>
  );
}

export function DonationsSection({
  donations,
  error,
  onAllocationCreated,
  onAllocationDeleted,
}: {
  donations: AdminDonation[] | null;
  error: string | null;
  onAllocationCreated: (
    donationId: string,
    allocation: AdminAllocation,
  ) => void;
  onAllocationDeleted: (donationId: string, allocationId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Donations</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Select a donation to create allocations and generate access tokens.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!donations ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : donations.length === 0 ? (
        <div className="text-gray-400 text-sm">No donations found.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {donations.map((d) => (
            <DonationRow
              key={d.id}
              donation={d}
              onAllocationCreated={onAllocationCreated}
              onAllocationDeleted={onAllocationDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
