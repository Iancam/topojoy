import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartOrder } from "./api";
import { order } from "./api";

export type CartContextValue = {
  cart: CartOrder | null | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<CartOrder | null | undefined>;
  itemCount: number;
  setCart: React.Dispatch<React.SetStateAction<CartOrder | null | undefined>>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartOrder | null | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await order.getCart();
      setCart(data);
      return data;
    } catch (err) {
      setError("Failed to load cart");
      setCart(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const itemCount = (cart?.orderItems || []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );

  return (
    <CartContext.Provider
      value={{ cart, loading, error, refresh, itemCount, setCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return ctx;
};
