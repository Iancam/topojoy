import React, { useEffect, useState } from "react";
import { giftedMap as giftedMapAPI } from "../api";
import { GiftedMapReflection } from "./GiftedMapReflection";

type GiftedMapSummary = {
  id: string;
  orderId: string;
  totalCost: number;
  createdAt: string;
  giverMessage: string | null;
  recipientMessage: string | null;
  mapConfig: { title: string; imageUrl: string | null } | null;
};

export const GiftsSentReflections: React.FC = () => {
  const [gifts, setGifts] = useState<GiftedMapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    giftedMapAPI
      .list({})
      .then((data: any) => {
        setGifts(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load gifts sent");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-400 py-2">Loading gifts sent…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (gifts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No gifts sent yet. When someone redeems your gift and places an order,
        it will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {gifts.map((g) => (
        <GiftedMapReflection key={g.id} giftedMapId={g.id} />
      ))}
    </div>
  );
};
