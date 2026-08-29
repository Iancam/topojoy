import { useState, useEffect } from "react";
import { donation, order } from "../api";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { formatMoney } from "../lib/utils";
import { useCartContext } from "../cartContext";
import { MapThumbnail } from "../components/MapThumbnail";
import { getStoredGiftToken } from "@/lib/giftToken";
import { getGiftAccessToken } from "./checkout/utils";

export const Cart = () => {
  const { cart, loading, error, refresh, setCart } = useCartContext();
  const [localError, setLocalError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [giftAdjustments, setGiftAdjustments] = useState<Record<
    string,
    number
  > | null>(null);

  const emptyCart = !cart || !cart.orderItems || cart.orderItems.length === 0;

  useEffect(() => {
    refresh();
  }, []);

  const giftAccessToken = getGiftAccessToken(cart);

  useEffect(() => {
    const token = getGiftAccessToken(cart);
    if (!token) return;
    const items = cart?.orderItems;
    if (!items?.length) return;
    donation
      .getGiftValue({
        accessToken: token,
        orderId: cart?.id,
        items: items.map((item) => ({
          subcategoryId: item.subcategoryId,
          width: item.width,
          height: item.height,
          options: item.orderItemOptions,
        })),
      })
      .then((data: any) => {
        if (!data?.items) return;
        const adjustments: Record<string, number> = {};
        items.forEach((item, i) => {
          const adj = data.items[i]?.adjustedAmountAvailable;
          if (typeof adj === "number") {
            adjustments[item.id] = adj;
          }
        });
        setGiftAdjustments(adjustments);
      })
      .catch(() => {
        // gift token invalid or expired — silently ignore
      });
  }, [cart?.orderItems]);

  if (error || localError || emptyCart) {
    return (
      <div>
        <Header />
        <div className="max-w-3xl mx-auto py-8 px-4 my-15">
          <h1 className="text-2xl font-semibold mb-4">Your Cart</h1>
          {(error || localError) && (
            <p className="text-sm text-red-600">{error || localError}</p>
          )}
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
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
  const adjustedTotal = giftAdjustments
    ? items.reduce((sum, item) => {
        const adj = giftAdjustments[item.id];
        const price = item.itemPrice ?? 0;
        return sum + Math.max(0, price - (adj ?? 0)) * (item.quantity ?? 1);
      }, 0)
    : null;

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    if (!cart) return;

    // optimistic update
    const prevCart = cart;
    const nextItems = cart.orderItems.map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    );
    const nextCart = { ...cart, orderItems: nextItems };
    setCart(nextCart);

    setUpdatingItemId(itemId);
    try {
      await order.updateItem({ itemId, quantity });
      await refresh();
    } catch (err) {
      console.error("Failed to update quantity", err);
      setLocalError("Failed to update quantity");
      setCart(prevCart);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!cart) return;

    const prevCart = cart;
    const nextItems = cart.orderItems.filter((item) => item.id !== itemId);
    const nextCart = { ...cart, orderItems: nextItems };
    setCart(nextCart);

    setUpdatingItemId(itemId);
    try {
      await order.removeItem({ itemId });
      await refresh();
    } catch (err) {
      console.error("Failed to remove item", err);
      setLocalError("Failed to remove item");
      setCart(prevCart);
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div>
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 mt-15 space-y-6">
        <h1 className="text-2xl font-semibold">Your Cart</h1>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            {items.map((item) => {
              const s3Key = item.mapConfig?.s3Key;
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
                      {s3Key ? (
                        <MapThumbnail
                          title={item.filename || "Map preview"}
                          s3Key={s3Key}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No image</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="font-medium text-gray-900 truncate">
                        {item.mapConfig?.filename || "Untitled map"}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {item.printType} · {item.width}&quot; × {item.height}
                        &quot;
                      </div>
                      <div className="text-sm font-medium mt-1">
                        {giftAdjustments?.[item.id] != null ? (
                          <>
                            {/* <span className="line-through text-gray-400 mr-1">
                              {formatMoney(item.itemPrice)}
                            </span> */}
                            <span className="text-green-700">
                              {formatMoney(
                                Math.max(
                                  0,
                                  item.itemPrice - giftAdjustments[item.id],
                                ),
                              )}
                            </span>
                            <span className="ml-1 text-xs text-green-600">
                              (gift applied)
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-900">
                            {giftAccessToken
                              ? "Gift"
                              : formatMoney(item.itemPrice)}
                          </span>
                        )}
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
              <div className="text-right">
                {adjustedTotal !== null ? (
                  <>
                    {/* <div className="line-through text-gray-400 text-xs">
                      {formatMoney(orderTotal)}
                    </div> */}
                    <div className="font-semibold text-green-700">
                      {formatMoney(adjustedTotal)}
                    </div>
                  </>
                ) : (
                  <span className="font-semibold">
                    {formatMoney(orderTotal)}
                  </span>
                )}
              </div>
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
