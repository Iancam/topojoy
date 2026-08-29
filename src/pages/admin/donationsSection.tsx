import { admin } from "@/api";
import { formatMoney } from "@/lib/utils";
import { FormEvent, useEffect, useState } from "react";

export type AdminAllocation = {
  id: string;
  accessToken: string | null;
  maxAmountDrawn: number | null;
  useFullAmount: boolean;
  amountDrawn: number;
  orderId: string | null;
  createdAt: string;
  giftTokenId?: string | null;
  giftToken?: { accessToken: string } | null;
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

export type AdminGiftToken = {
  id: string;
  accessToken: string;
  label: string | null;
  orderId: string | null;
  createdAt: string;
  combinedMaxAmountDrawn: number;
  totalAmountDrawn: number;
  allocations: {
    id: string;
    maxAmountDrawn: number | null;
    amountDrawn: number;
    donation: {
      id: string;
      amount: number;
      expiryDate: string;
      donor: { id: string; email: string | null } | null;
    };
  }[];
};

function CopyButton({
  text,
  label = "copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors whitespace-nowrap"
      title={`Copy ${label === "copy code" ? "gift code" : "link"}`}
    >
      {copied ? "✓" : label}
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
  selectedAllocationIds,
  onToggleSelect,
  onAllocationCreated,
  onAllocationDeleted,
}: {
  donation: AdminDonation;
  selectedAllocationIds: Set<string>;
  onToggleSelect: (allocationId: string) => void;
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
              {donation.allocations.map((a) => {
                const isGrouped = !!a.giftTokenId;
                const isSelectable =
                  !donation.restricted && a.amountDrawn === 0 && !isGrouped;
                return (
                  <div
                    key={a.id}
                    className="rounded border border-gray-100 bg-gray-50 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                  >
                    <input
                      type="checkbox"
                      title={
                        isGrouped
                          ? "Already part of a gift token"
                          : !isSelectable
                            ? "Restricted donations or used allocations cannot be aggregated"
                            : "Select to combine into a gift token"
                      }
                      checked={selectedAllocationIds.has(a.id)}
                      disabled={!isSelectable}
                      onChange={() => onToggleSelect(a.id)}
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide shrink-0">
                        Gift Link
                      </span>
                      {isGrouped ? (
                        <span className="text-xs text-teal-600 italic">
                          part of a combined gift token
                        </span>
                      ) : a.accessToken ? (
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
                          <CopyButton text={a.accessToken} label="copy code" />
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
                    {a.amountDrawn === 0 && !isGrouped && (
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
                );
              })}
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

function AggregateSelectionBar({
  selectedCount,
  onAggregate,
  onClear,
  submitting,
  error,
}: {
  selectedCount: number;
  onAggregate: (label: string) => void;
  onClear: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [label, setLabel] = useState("");
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
      <span className="text-sm font-semibold text-teal-800">
        {selectedCount} allocation{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <input
        type="text"
        placeholder="Optional label (e.g. Wedding gift pool)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[200px]"
      />
      <button
        type="button"
        disabled={selectedCount < 2 || submitting}
        onClick={() => onAggregate(label)}
        title={
          selectedCount < 2
            ? "Select at least two allocations to aggregate"
            : undefined
        }
        className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
          selectedCount < 2 || submitting
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-teal-600 text-white hover:bg-teal-700"
        }`}
      >
        {submitting ? "Combining…" : "Combine into Gift Token"}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={submitting}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Clear
      </button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </div>
  );
}

function GiftTokenRow({
  giftToken,
  onDelete,
}: {
  giftToken: AdminGiftToken;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await admin.giftTokenDelete({ id: giftToken.id });
      onDelete(giftToken.id);
    } catch (e: any) {
      alert(e?.message || "Failed to delete gift token");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`${window.location.origin}/gift/${giftToken.accessToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-teal-700 hover:underline"
        >
          {window.location.host}/gift/{giftToken.accessToken}
        </a>
        <CopyButton text={giftToken.accessToken} label="copy code" />
        {giftToken.label && (
          <span className="text-xs text-gray-500 italic">
            "{giftToken.label}"
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          Drawn: {formatMoney(giftToken.totalAmountDrawn)} /{" "}
          {formatMoney(giftToken.combinedMaxAmountDrawn)}
        </span>
        {!giftToken.orderId && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? "ungrouping…" : "ungroup"}
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {giftToken.allocations.map((a) => (
          <div
            key={a.id}
            className="text-[11px] text-gray-500 flex items-center gap-2"
          >
            <span className="font-mono">{a.donation.id}</span>
            <span>{a.donation.donor?.email ?? "anonymous"}</span>
            <span>
              cap {formatMoney(a.maxAmountDrawn ?? a.donation.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type DonationsSectionProps = {
  donations: AdminDonation[] | null;
  giftTokens: AdminGiftToken[] | null;
  setDonations: React.Dispatch<React.SetStateAction<AdminDonation[] | null>>;
  setGiftTokens: React.Dispatch<React.SetStateAction<AdminGiftToken[] | null>>;
};

export function DonationsSection({
  donations,
  giftTokens,
  setDonations,
  setGiftTokens,
}: DonationsSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<
    Set<string>
  >(new Set());
  const [aggregating, setAggregating] = useState(false);
  const [aggregateError, setAggregateError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    admin
      .donationsList()
      .then(setDonations)
      .catch((e: any) => setError(e?.message || "Failed to load donations"));
    admin
      .giftTokensList()
      .then(setGiftTokens)
      .catch((e: any) => setError(e?.message || "Failed to load gift tokens"));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAllocationCreated = (
    donationId: string,
    allocation: AdminAllocation,
  ) => {
    setDonations((curr) =>
      (curr ?? []).map((d) =>
        d.id === donationId
          ? {
              ...d,
              allocations: [...d.allocations, allocation],
              totalAmountDrawn: d.totalAmountDrawn + allocation.amountDrawn,
              effectiveAmountDrawn:
                d.effectiveAmountDrawn +
                (allocation.amountDrawn > 0
                  ? allocation.amountDrawn
                  : (allocation.maxAmountDrawn ?? 0)),
            }
          : d,
      ),
    );
  };

  const handleAllocationDeleted = (
    donationId: string,
    allocationId: string,
  ) => {
    setDonations((curr) =>
      (curr ?? []).map((d) => {
        if (d.id !== donationId) return d;
        const removed = d.allocations.find((a) => a.id === allocationId);
        return {
          ...d,
          allocations: d.allocations.filter((a) => a.id !== allocationId),
          effectiveAmountDrawn:
            d.effectiveAmountDrawn - (removed?.maxAmountDrawn ?? 0),
        };
      }),
    );
  };

  const handleGiftTokensChanged = () => {
    load();
  };

  const toggleSelect = (allocationId: string) => {
    setSelectedAllocationIds((curr) => {
      const next = new Set(curr);
      if (next.has(allocationId)) next.delete(allocationId);
      else next.add(allocationId);
      return next;
    });
  };

  const handleAggregate = async (label: string) => {
    setAggregating(true);
    setAggregateError(null);
    try {
      await admin.giftTokenCreate({
        allocationIds: Array.from(selectedAllocationIds),
        label: label.trim() || undefined,
      });
      setSelectedAllocationIds(new Set());
      handleGiftTokensChanged();
    } catch (e: any) {
      setAggregateError(e?.message || "Failed to create gift token");
    } finally {
      setAggregating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Donations</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Select a donation to create allocations and generate access tokens.
          Select allocations across donations (non-restricted, unused) to
          combine them into a single pooled gift link.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <AggregateSelectionBar
        selectedCount={selectedAllocationIds.size}
        onAggregate={handleAggregate}
        onClear={() => setSelectedAllocationIds(new Set())}
        submitting={aggregating}
        error={aggregateError}
      />

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
              selectedAllocationIds={selectedAllocationIds}
              onToggleSelect={toggleSelect}
              onAllocationCreated={handleAllocationCreated}
              onAllocationDeleted={handleAllocationDeleted}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900">Gift Tokens</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Pooled gift links combining several donation allocations.
        </p>
      </div>
      {!giftTokens ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : giftTokens.length === 0 ? (
        <div className="text-gray-400 text-sm">No gift tokens yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {giftTokens.map((gt) => (
            <GiftTokenRow
              key={gt.id}
              giftToken={gt}
              onDelete={handleGiftTokensChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
