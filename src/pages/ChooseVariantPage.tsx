import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Header } from "../components/Header";
import { submission, netlifyImageUrl } from "../api";
import { MapThumbnail } from "../components/MapThumbnail";

type Variant = {
  id: string;
  title: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  status?: string | null;
  createdAt: string;
};

function VariantThumb({
  v,
  onExpand,
}: {
  v: Variant;
  onExpand: (v: Variant) => void;
}) {
  return (
    <div className="group flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-teal-500/50 transition-colors">
      <button
        type="button"
        onClick={() => onExpand(v)}
        className="relative aspect-[3/4] bg-black/20 overflow-hidden cursor-zoom-in"
        aria-label={`Expand ${v.title}`}
      >
        {v.s3Key ? (
          <MapThumbnail title={v.title} s3Key={v.s3Key} />
        ) : v.imageUrl ? (
          <img
            src={netlifyImageUrl(v.imageUrl, { w: 480, fit: "cover" })}
            alt={v.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
            Preview coming soon
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <span className="text-white text-xs font-medium bg-black/50 rounded px-2 py-1">
            View full size
          </span>
        </span>
      </button>
      <div className="p-4 text-sm font-medium text-white">{v.title}</div>
    </div>
  );
}

function Lightbox({
  variant,
  onClose,
  onSelect,
}: {
  variant: Variant;
  onClose: () => void;
  onSelect: (v: Variant) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-8 right-0 text-white/60 hover:text-white text-sm"
          aria-label="Close"
        >
          ✕ close
        </button>

        <div className="w-full max-h-[75vh] overflow-hidden rounded-xl bg-black/20 flex items-center justify-center">
          {variant.s3Key ? (
            <MapThumbnail
              title={variant.title}
              s3Key={variant.s3Key}
              width={960}
            />
          ) : variant.imageUrl ? (
            <img
              src={netlifyImageUrl(variant.imageUrl, { w: 960, fit: "cover" })}
              alt={variant.title}
              className="max-h-[75vh] max-w-full object-contain"
            />
          ) : (
            <div className="text-white/20 text-sm p-20">No preview</div>
          )}
        </div>

        <p className="text-white font-medium">{variant.title}</p>

        <button
          type="button"
          onClick={() => onSelect(variant)}
          className="px-8 py-2.5 bg-teal-500 hover:bg-teal-400 text-action-foreground font-semibold text-sm rounded-lg transition-colors"
        >
          Select this style →
        </button>
      </div>
    </div>
  );
}

function MessagePanel({
  parentId,
  onDone,
}: {
  parentId: string;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setErr(null);
    try {
      await submission.sendMessage({ parentId, message: message.trim() });
      setSent(true);
    } catch (e: any) {
      setErr(e.message || "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-teal-700/40 bg-teal-900/20 p-6 flex flex-col gap-3 text-center">
        <p className="text-teal-300 font-medium">Message sent!</p>
        <p className="text-sm text-action">
          Ian will be in touch with updated variations soon.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-2 text-xs text-white/40 hover:text-white/70 underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-white mb-1">Request changes</p>
        <p className="text-xs text-action leading-5">
          Not quite right? Describe what you'd like adjusted — colours, style,
          area — and Ian will prepare new variations.
        </p>
      </div>
      <textarea
        ref={textareaRef}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. I love the blue palette but could the contour lines be a bit lighter?"
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/60 resize-none"
      />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ChooseVariantPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Variant | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !parentId) return;
    submission
      .variantsList({ parentId })
      .then((data: Variant[]) => setVariants(data))
      .catch((err: Error) => setError(err.message || "Failed to load variants"))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, parentId]);

  const handleSelect = (v: Variant) => {
    navigate(`/app?step=4&configId=${v.id}`);
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="min-h-screen flex flex-col theme-topojoy-dark bg-canvas text-text">
      <Header />

      {expanded && (
        <Lightbox
          variant={expanded}
          onClose={() => setExpanded(null)}
          onSelect={(v) => {
            setExpanded(null);
            handleSelect(v);
          }}
        />
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-20 pb-16">
        <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white mb-2">
          Choose your style
        </h1>
        <p className="text-sm text-action mb-10 leading-6">
          Ian has prepared a few variations for you. Click any to view it full
          size, then select the one that feels right — or send a message if
          you'd like something adjusted.
        </p>

        {loading && (
          <p className="text-sm text-action animate-pulse">
            Loading variations…
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {!loading && !error && variants.length === 0 && (
          <p className="text-sm text-action">
            No variations available yet. Ian will be in touch soon!
          </p>
        )}

        {!loading && variants.length > 0 && (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
              {variants.map((v) => (
                <VariantThumb key={v.id} v={v} onExpand={setExpanded} />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
              <p className="text-xs text-action">
                Like one but want small tweaks?
              </p>
              {!showMessage && (
                <button
                  type="button"
                  onClick={() => setShowMessage(true)}
                  className="text-xs text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
                >
                  Send Ian a message →
                </button>
              )}
            </div>

            {showMessage && parentId && (
              <MessagePanel
                parentId={parentId}
                onDone={() => setShowMessage(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
