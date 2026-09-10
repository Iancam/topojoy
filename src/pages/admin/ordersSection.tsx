import { admin } from "@/api";
import { formatMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

export type AdminOrderItem = {
  id: string;
  subcategoryId: number;
  width: number;
  height: number;
  quantity: number;
  totalPrice: number;
  mapConfig: { id: string; title: string; filename: string } | null;
};

export type AdminOrder = {
  id: string;
  orderNumber: string | null;
  status: string;
  shippingMethod: string;
  currency: string;
  totalPrice: number;
  paymentIntentId: string | null;
  submissionErrorMessage: string | null;
  submissionErrorAt: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; email: string | null; name: string } | null;
  recipient: {
    name: string;
    email: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  } | null;
  orderItems: AdminOrderItem[];
  giftedMap: { id: string } | null;
  donationAllocations: {
    id: string;
    amountDrawn: number;
    giftTokenId: string | null;
    donation: { id: string; donor: { email: string | null } | null };
  }[];
};

const statusColor: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-gray-50 text-gray-500 border-gray-200",
};

function RetryButton({
  orderId,
  onRetried,
}: {
  orderId: string;
  onRetried: () => void;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  const handleClick = async () => {
    setState("sending");
    try {
      await admin.orderRetrySubmission({ orderId });
      onRetried();
      setState("idle");
    } catch (e: any) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "sending"}
      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors disabled:opacity-40"
    >
      {state === "sending"
        ? "retrying…"
        : state === "error"
          ? "failed — retry"
          : "retry submission"}
    </button>
  );
}

function OrderRow({
  order,
  onRetried,
}: {
  order: AdminOrder;
  onRetried: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const colorClass =
    statusColor[order.status] ?? "bg-gray-50 text-gray-500 border-gray-200";
  const placedAt = order.submittedAt ?? order.paidAt ?? order.createdAt;

  const giftDrawnCents = order.donationAllocations.reduce(
    (sum, a) => sum + a.amountDrawn,
    0,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">
              {order.orderNumber ?? order.id}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${colorClass}`}
            >
              {order.status}
            </span>
            {order.submissionErrorMessage && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                submission error
              </span>
            )}
            {order.giftedMap && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                gifted map
              </span>
            )}
            {giftDrawnCents > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200">
                gift applied: {formatMoney(giftDrawnCents)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {order.user?.email ?? order.recipient?.email ?? "unknown user"}
            {order.recipient?.name && <> &bull; ships to {order.recipient.name}</>}
            &bull; {order.orderItems.length} item
            {order.orderItems.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="text-sm font-semibold text-gray-900 shrink-0">
          {formatMoney(order.totalPrice)}
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {new Date(placedAt).toLocaleDateString()}
        </div>
        <span className="text-gray-400 text-xs shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="divide-y divide-gray-100 rounded border border-gray-100">
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className="px-3 py-2 flex justify-between items-center text-sm text-gray-700"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {item.mapConfig?.title ?? "Untitled"}
                  </div>
                  <div className="text-xs text-gray-400">
                    #{item.subcategoryId} &bull; {item.width}" ×{" "}
                    {item.height}" &bull; Qty {item.quantity}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {formatMoney(item.totalPrice)}
                </div>
              </div>
            ))}
          </div>

          {order.recipient && (
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">
                Shipping ({order.shippingMethod}):
              </span>{" "}
              {[
                order.recipient.name,
                order.recipient.addressLine1,
                order.recipient.addressLine2,
                order.recipient.city,
                order.recipient.state,
                order.recipient.postalCode,
                order.recipient.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}

          {order.paymentIntentId && (
            <div className="text-[10px] text-gray-300 font-mono">
              payment intent: {order.paymentIntentId}
            </div>
          )}

          {order.donationAllocations.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">
                Funded by donation(s):
              </span>{" "}
              {order.donationAllocations
                .map(
                  (a) =>
                    `${a.donation.donor?.email ?? "anonymous"} (${formatMoney(
                      a.amountDrawn,
                    )})`,
                )
                .join(", ")}
            </div>
          )}

          {order.submissionErrorMessage && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setErrorExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  <span>{errorExpanded ? "▾" : "▸"}</span>
                  Submission error
                </button>
                <RetryButton orderId={order.id} onRetried={onRetried} />
              </div>
              {errorExpanded && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 whitespace-pre-wrap break-all">
                  {order.submissionErrorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdersSection({
  orders,
  error,
  onRefresh,
}: {
  orders: AdminOrder[] | null;
  error: string | null;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        o.recipient?.email?.toLowerCase().includes(q) ||
        o.recipient?.name?.toLowerCase().includes(q) ||
        o.orderItems.some((item) =>
          item.mapConfig?.title.toLowerCase().includes(q),
        )
      );
    });
  }, [orders, search, statusFilter]);

  const statuses = useMemo(() => {
    if (!orders) return [];
    return Array.from(new Set(orders.map((o) => o.status)));
  }, [orders]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Order History
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search by order, email, or map title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!orders ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm">No orders found.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <OrderRow key={o.id} order={o} onRetried={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
