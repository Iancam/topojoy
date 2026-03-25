import React from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { order as orderAPI } from "../api";

type OrderItem = {
  id: string;
  filename: string;
  printType: string;
  width: number;
  height: number;
  quantity: number;
  totalPrice: number;
  mapConfig: { title: string; filename: string } | null;
};

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  shippingMethod: string;
  paidAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  submissionErrorMessage: string | null;
  orderItems: OrderItem[];
};

const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const statusColor: Record<string, string> = {
  paid: "text-green-700 bg-green-50 border-green-200",
  submitted: "text-blue-700 bg-blue-50 border-blue-200",
  pending: "text-gray-500 bg-gray-50 border-gray-200",
};

export default function MyOrders() {
  const { userId } = useAuth();
  const [orders, setOrders] = React.useState<Order[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedErrors, setExpandedErrors] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    if (!userId) return;
    orderAPI
      .list({})
      .then((data: unknown) => setOrders(data as Order[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return (
      <div className="p-6">You must be signed in to view your orders.</div>
    );
  }

  return (
    <div>
      <Header />
      <div className="min-h-screen pt-20 px-6 pb-12 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">My Orders</h1>

        {loading && <p className="text-sm text-gray-500">Loading orders…</p>}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}
        {!loading && !error && orders?.length === 0 && (
          <p className="text-gray-500 text-sm">
            You haven't placed any orders yet.
          </p>
        )}

        {orders && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((o) => {
              const placedAt = o.submittedAt ?? o.paidAt ?? o.createdAt;
              const colorClass =
                statusColor[o.status] ??
                "text-gray-500 bg-gray-50 border-gray-200";
              return (
                <div
                  key={o.id}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-400 font-mono">
                        {o.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(placedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize ${colorClass}`}
                      >
                        {o.status}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatMoney(o.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {o.orderItems.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {o.orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 flex justify-between text-sm text-gray-700"
                        >
                          <div>
                            <div className="font-medium truncate">
                              {item.mapConfig?.title ||
                                item.filename ||
                                "Untitled"}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.printType} · {item.width}" × {item.height}"
                              · Qty {item.quantity}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            {formatMoney(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Shipping: {o.shippingMethod}
                  </div>
                  {o.submissionErrorMessage && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedErrors((prev) => ({
                            ...prev,
                            [o.id]: !prev[o.id],
                          }))
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        <span>{expandedErrors[o.id] ? "▾" : "▸"}</span>
                        Submission error
                      </button>
                      {expandedErrors[o.id] && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 whitespace-pre-wrap break-all">
                          {o.submissionErrorMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
