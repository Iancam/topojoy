import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { submission } from "../api";
import { LS } from "../lib/utils";
import { getUserSelectedTrailsLatLng } from "../map/trails";
import {
  GIFT_INTENT_KEY,
  getStoredGiftIntent,
  steps as reflectionSteps,
} from "../components/GiftIntentForm";

export default function SubmitPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBbox, setHasBbox] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate(
        `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`,
        { replace: true },
      );
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const intent = getStoredGiftIntent();
    if (intent?.title) setTitle(intent.title);
    const bbox = localStorage.getItem(LS.GEOJSON_BBOX);
    setHasBbox(!!bbox && bbox !== "{}");
  }, []);

  const buildReflections = () => {
    const intent = getStoredGiftIntent();
    if (!intent) return [];
    return reflectionSteps
      .filter(
        (s) => !s.noAnswer && intent[s.key as keyof typeof intent]?.trim(),
      )
      .map((s) => ({
        question: s.prompt,
        answer: intent[s.key as keyof typeof intent] as string,
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const bbox = JSON.parse(localStorage.getItem(LS.GEOJSON_BBOX) || "{}");
      const selectedTrails = getUserSelectedTrailsLatLng();

      await submission.create({
        title: title.trim(),
        bbox,
        selectedTrails,
        reflections: buildReflections(),
        message: message.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || !isSignedIn) return null;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col theme-topojoy-dark bg-canvas text-text">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg text-center">
            <p className="text-4xl mb-6">🗺️</p>
            <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white mb-4">
              We've got it.
            </h1>
            <p className="text-base text-text-muted leading-7 mb-6">
              Ian will review your trails and be in touch within a few days with
              a selection of map styles to choose from.
            </p>
            <p className="text-sm text-action">
              You'll get an email at{" "}
              <span className="font-mono">
                {user?.primaryEmailAddress?.emailAddress}
              </span>{" "}
              with a link to pick your favourite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col theme-topojoy-dark bg-canvas text-text">
      <Header />
      <div className="flex-1 flex items-start justify-center pt-20 pb-16 px-6">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white mb-2">
            Hand off your map
          </h1>
          <p className="text-sm text-action mb-8 leading-6">
            Ian will take your trail data and create a few style variations for
            you to choose from. Once you pick one, you'll be able to order a
            print.
          </p>

          {!hasBbox && (
            <div className="mb-6 p-4 bg-amber-900/30 border border-amber-600/40 rounded-lg text-sm text-amber-300">
              No map data found. Make sure you've selected trails in the{" "}
              <a
                href="/geojson.io/index.html"
                className="underline hover:text-amber-200"
              >
                map editor
              </a>{" "}
              before submitting.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-action mb-1.5">
                Map title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Redwood Creek, 2013"'
                required
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-action mb-1.5">
                Message to Ian{" "}
                <span className="font-normal normal-case text-white/30">
                  (optional)
                </span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything you'd like Ian to know about the map or the gift…"
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-400 resize-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !title.trim() || !hasBbox}
              className="px-8 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-action-foreground font-bold rounded transition-colors duration-200"
            >
              {submitting ? "Submitting…" : "Submit my map →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
