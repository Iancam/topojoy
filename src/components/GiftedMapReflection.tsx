import React, { useEffect, useState } from "react";
import { giftedMap as giftedMapAPI } from "../api";

type GiftedMapData = {
  id: string;
  role: "giver" | "recipient";
  giverMessage: string | null;
  giverReflection: string | null;
  recipientMessage: string | null;
  recipientReflection: string | null;
  mapConfig: { title: string; imageUrl: string | null } | null;
  totalCost: number;
  createdAt: string;
};

type Props = {
  /** Pass either orderId (recipient looking up by their order) or giftedMapId directly */
  orderId?: string;
  giftedMapId?: string;
};

export const GiftedMapReflection: React.FC<Props> = ({
  orderId,
  giftedMapId,
}) => {
  const [data, setData] = useState<GiftedMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [message, setMessage] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (giftedMapId) params.giftedMapId = giftedMapId;
    else if (orderId) params.orderId = orderId;
    else return;

    setLoading(true);
    giftedMapAPI
      .get(params)
      .then((d: any) => {
        setData(d);
        setMessage(
          d.role === "giver"
            ? (d.giverMessage ?? "")
            : (d.recipientMessage ?? ""),
        );
        setReflection(
          d.role === "giver"
            ? (d.giverReflection ?? "")
            : (d.recipientReflection ?? ""),
        );
      })
      .catch((err: any) => {
        if (err?.status === 404 || err?.message?.includes("404")) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [orderId, giftedMapId]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated: any = await giftedMapAPI.updateReflection({
        giftedMapId: data.id,
        message,
        reflection,
      });
      setData((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-400 py-4">
        Loading reflection…
      </p>
    );
  }

  if (notFound || !data) {
    return null;
  }

  const isGiver = data.role === "giver";
  const otherMessage = isGiver ? data.recipientMessage : data.giverMessage;
  const otherReflection = isGiver
    ? data.recipientReflection
    : data.giverReflection;
  const otherLabel = isGiver ? "Recipient's note" : "Giver's note";

  const myMessageLabel = isGiver
    ? "Leave a note for the recipient"
    : "Leave a note for the giver";
  const myReflectionLabel = isGiver
    ? "Your reflections on giving this gift"
    : "Your reflections on receiving this gift";

  return (
    <div className="mt-4 border border-teal-200 rounded-lg bg-teal-50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">💌</span>
        <h4 className="text-sm font-semibold text-teal-900">
          {isGiver ? "Your Gift" : "Gifted Map"}
          {data.mapConfig?.title && (
            <span className="font-normal text-teal-700">
              {" "}— {data.mapConfig.title}
            </span>
          )}
        </h4>
      </div>

      {/* Other party's message, read-only */}
      {(otherMessage || otherReflection) && (
        <div className="bg-white border border-teal-100 rounded p-3 space-y-2">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
            {otherLabel}
          </p>
          {otherMessage && (
            <p className="text-sm text-gray-700 italic">"{otherMessage}"</p>
          )}
          {otherReflection && (
            <p className="text-sm text-gray-600">{otherReflection}</p>
          )}
        </div>
      )}

      {/* My editable fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-teal-800 mb-1">
            {myMessageLabel}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Write something heartfelt…"
            className="w-full text-sm border border-teal-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-800 mb-1">
            {myReflectionLabel}
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            placeholder="What does this gift mean to you?"
            className="w-full text-sm border border-teal-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="text-xs text-teal-700">✓ Saved</span>
          )}
          {saveError && (
            <span className="text-xs text-red-600">{saveError}</span>
          )}
        </div>
      </div>
    </div>
  );
};
