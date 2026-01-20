import { useEffect, useState } from "react";
import type { CartOrder } from "./api";
import { order } from "./api";
import { Link } from "react-router";
import { Header } from "./components/Header";
import { formatMoney } from "./lib/utils";

export const Cart = () => {
  const [cart, setCart] = useState<CartOrder | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    order
      .getCart()
      .then((data) => {
        if (!cancelled) setCart(data);
      })
      .catch((err) => {
        console.error("Failed to load cart", err);
        if (!cancelled) setError("Failed to load cart");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const emptyCart = !cart || !cart.orderItems || cart.orderItems.length === 0;

  if (error || emptyCart) {
    return (
      <div>
        <Header />
        <div className="max-w-3xl mx-auto py-8 px-4 my-15">
          <h1 className="text-2xl font-semibold mb-4">Your Cart</h1>
          {error && <p className="text-sm text-red-600"></p>}
          {cart === undefined && (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
          {emptyCart && (
            <p className="text-sm text-gray-500">
              You don&apos;t have any maps in your cart yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  const items = cart.orderItems;
  const orderTotal =
    cart.totalPrice ?? items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await order.updateItem({ itemId, quantity });
      setCart(updated);
    } catch (err) {
      console.error("Failed to update quantity", err);
      setError("Failed to update quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingItemId(itemId);
    try {
      const updated = await order.removeItem({ itemId });
      setCart(updated);
    } catch (err) {
      console.error("Failed to remove item", err);
      setError("Failed to remove item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div>
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-semibold">Your Cart</h1>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            {items.map((item) => {
              const imageUrl = item.mapConfig?.s3Key;
              return (
                <article
                  key={item.id}
                  className="flex gap-4 border rounded-lg p-3 bg-white shadow-sm"
                >
                  <Link
                    to={
                      item.mapConfigId
                        ? `/app/?configId=${item.mapConfigId}`
                        : "/app"
                    }
                    className="flex-1 flex gap-4 no-underline text-inherit"
                  >
                    <div className="w-32 h-24 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.filename || "Map preview"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No image</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="font-medium text-gray-900 truncate">
                        {item.filename || "Untitled map"}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {item.printType} · {item.width}&quot; × {item.height}
                        &quot;
                      </div>
                      <div className="text-gray-900 text-sm font-medium mt-1">
                        Item: {formatMoney(item.itemPrice)}
                        {item.userContribution
                          ? ` · Contribution: ${formatMoney(item.userContribution)}`
                          : ""}
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col items-end justify-between text-xs min-w-[4.5rem]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity - 1)
                        }
                        disabled={
                          updatingItemId === item.id || item.quantity <= 1
                        }
                        className="w-6 h-6 flex items-center justify-center border rounded disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="px-1 w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity + 1)
                        }
                        disabled={updatingItemId === item.id}
                        className="w-6 h-6 flex items-center justify-center border rounded disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={updatingItemId === item.id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="border rounded-lg p-4 bg-white shadow-sm h-fit space-y-3">
            <h2 className="text-lg font-semibold">Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">{formatMoney(orderTotal)}</span>
            </div>
            <Link to="/checkout?step=shipping">
              <button
                type="button"
                className="mt-3 w-full px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                Checkout
              </button>
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
};
